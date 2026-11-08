		document.addEventListener("DOMContentLoaded", init);
		document.addEventListener("mousemove", updateMousePos);
		document.addEventListener("mousedown", handleClick);

		var canvas;
		var ctx;
		var mouseX;
		var mouseY;

		//globals for drawing
		var initialTriHeight;
		const initialyOffset = 0;
		const initialxOffset = 0;
		var triHeightGlobal;
		var borderGradient;
		var sierpinskiDepth = 3;

		//globals for controlling
		const TRIS = {NONE: 0, CENTER: 1, TOP: 2, RIGHT: 3, LEFT: 4}
		var centerTriOn = false;
		var activeTriFill = 0; //values can be 1-4; 1 is center, 2-4 are top, right, left in that order
		var lastActiveTriFill = 0;
		var selectedInfoTri = 0; //info tri that player clicks on
		var mainBranch = TRIS.NONE;

		//transition animation
		var currentLayer = 0; //0 is top/default state
		var isTransitioning = false;
		var transitionTimer = 0;
		var finalxOffset;
		var finalyOffset;
		var finalSize;
		var stages = []; //storing values for transitioning backwards
		var depthSizeMult = 1;

		//moving sierpinski
		var endX = 50;
		var leftToRight = true;
		var triXPos = 0; //used to move the sierpinski

		//color effects
		var colorYPos = 0; //used to create a wave effect in the triangle colors.
		var time = 0;

		//global options
		var yOffset = 0;

		//outline globals
		var lineProgress = 0;
		var highlightedLineProgress = 0;

		//fill globals
		var triFillAmt = 0;
		var triFillTime = 0;
		var triFillBackAmt = 0;
		var triFillBackTime = 0;
		var triOpacityAmt = 0;

		//globals for html position animating
		var triGroups = [];
		var infoPanel;

		var overlay;




		function init(e){
			infoPanel = document.querySelector(".infoPanel");
			document.querySelector(".closeBtn").addEventListener("click", closePanel);
			canvas = document.getElementById('maincanvas');
			//set canvas html element to be same size as page
			canvas.height = document.body.clientHeight;
			canvas.width = document.body.clientWidth;
			ctx = canvas.getContext('2d');
            //position initial html content
            let currentTriGroup = document.querySelector(".triGroup");
            triGroups[0] = currentTriGroup;
            //set tri params
			
			initialTriHeight = canvas.height / 2;
			//if triangle is too wide for narrow screens then make it smaller
			if(initialTriHeight * 1.5 > canvas.width ){
				initialTriHeight = canvas.width / 1.5;
			}
			triHeightGlobal = initialTriHeight
            positionTriGroup(currentTriGroup);
			//create gradient
			borderGradient =  ctx.createLinearGradient(20, 0, 1020, 1000);
			borderGradient.addColorStop(0, "green");
			borderGradient.addColorStop(0.5, "cyan");
			borderGradient.addColorStop(1, "blue");
			animate();

			window.addEventListener("resize", (event) => { 
				canvas.height = document.body.clientHeight;
				canvas.width = document.body.clientWidth;
				initialTriHeight = canvas.height / 2;
				//if triangle is too wide for narrow screens then make it smaller
				if(initialTriHeight * 1.5 > canvas.width ){
					initialTriHeight = canvas.width / 1.5;
					triHeightGlobal = initialTriHeight

				}
			})
			//set image click overlay event listeners
			overlay = document.querySelector(".image-overlay");
			const overlayImage = overlay.querySelector("img");
			
			document.querySelector(".zoomable").addEventListener('click', () => {
					overlayImage.src = document.querySelector(".infoPanel img").src;
					overlay.classList.add('active');
				});

			overlay.addEventListener('click', () => {
				overlay.classList.remove('active');
				overlayImage.src = '';
			});
		}
		

		function resetAnims(elm){
			let animations = elm.getAnimations();

			animations.forEach((anim) => {
				anim.cancel(); // Stops and resets the animation to its starting state
				anim.play();   // Starts the animation again
			});
		}

		function closePanel(e){
			infoPanel.style.animationDirection = "reverse";
			resetAnims(infoPanel);
			selectedInfoTri = TRIS.NONE;
		}

		function handleClick(e){
			//RESUME INTERRUPT
			// if(mainBranch == TRIS.TOP && currentLayer == 1 && activeTriFill == TRIS.LEFT){
			// 	window.open('./resumeWebView.html', '_blank').focus();
			// 	//mainBranch = TRIS.NONE;
			// 	return;
			// }
			if(activeTriFill != 0){
				//user clicks inside tri; play transition animation and halt mousemove handling until it is finished.
				//to perform the animation, we want to lerp the size and positioning of the sierpinski so that what is the current sierpinski outline is replaced with the tri that we clicked on
				//we do this by setting the new center of the sierpinski so that the tri is moved to the center of the screen
				//that way we can use the same handling for the tri-menus and content for every layer
				//can also be reversed by animating to the prev values

				if (infoPanel.parentNode.querySelector(":hover") == infoPanel || overlay.classList.contains("active")) {
					//Mouse is inside element
					return;
				} 

                //IF NOT CLICKING ON CENTER ON LAYER 2 THEN HANDLE TEXT DISPLAY INSTEAD
				if((currentLayer == 2 || mainBranch == TRIS.TOP) && activeTriFill != TRIS.CENTER){
					// do not go to submenu; display info instead

					let centerElm = triGroups[currentLayer].querySelector(".centerTri");
					let e;
					if(selectedInfoTri == activeTriFill){
						selectedInfoTri = TRIS.NONE;
						//infoPanel.classList.add("notActive");
						//reset info panel and play reverse animation
						infoPanel.style.animationDirection = "reverse";
						resetAnims(infoPanel);
						//bring back center content
					} else {
						selectedInfoTri = activeTriFill;
						//grab associated content
						if(selectedInfoTri == TRIS.RIGHT) e = centerElm.querySelector(".rightContent");
						else if(selectedInfoTri == TRIS.LEFT) e = centerElm.querySelector(".leftContent");
						else if(selectedInfoTri == TRIS.TOP) e = centerElm.querySelector(".topContent");
						//display infopanel
						infoPanel.style.animationDirection = "normal";
						infoPanel.classList.remove("notActive");
						resetAnims(infoPanel);
					}
					//display content to infopanel
					if(e != null && centerElm.querySelector(".activeCenter") != e){
						//all content blocks will have a p, most will have an img.
						document.querySelector("#panelContent p").innerHTML = e.querySelector("p").innerHTML;
						document.querySelector(".infoPanel h2").innerHTML = centerElm.querySelector(".centerContent").innerHTML;
						if(e.querySelector("img") != null){
							document.querySelector(".infoPanel img").style.display = "block";
							document.querySelector(".infoPanel img").setAttribute("src", e.querySelector("img").getAttribute("src"));
						} else {
							document.querySelector(".infoPanel img").style.display = "none";
						}

						// console.log("setting center");
						// //hide prev active elm
						// centerElm.querySelector(".activeCenter").classList.add("notActive");
						// centerElm.querySelector(".activeCenter").classList.remove("activeCenter");
						// //display content
						// e.classList.remove("notActive");
						// e.classList.add("activeCenter");
						//document.querySelector(".infoPanel").classList.add("notActive");
					}

					return;
				}
				let s = {xOff: triXPos, yOff: yOffset, size: triHeightGlobal}
				stages[currentLayer] = s;
				if(currentLayer == 0)mainBranch = activeTriFill;
	
                 //read tri clicked on and grab the next trigroup 
				switch (activeTriFill){
					case TRIS.CENTER: 
					//center will act as the back button
						if(currentLayer == 0)return;
						finalxOffset = stages[currentLayer-1].xOff;
						finalyOffset = stages[currentLayer-1].yOff;
						finalSize = stages[currentLayer-1].size;
						sierpinskiDepth -= 1;
						currentLayer -= 1;
						//trigger fade out on prev content - going backwards
						if(triGroups.length > currentLayer+1){
							triGroups[currentLayer+1].classList.remove("showContent");
							triGroups[currentLayer+1].classList.add("hideContent");
						}
						if(infoPanel.style.animationDirection != "reverse"){
							//reset info panel and play reverse animation if it is open when going backward
							infoPanel.style.animationDirection = "reverse";
							resetAnims(infoPanel);
						}
						mainBranch = TRIS.NONE;
						break;
					case TRIS.TOP: 
						finalxOffset = triXPos; //shouldnt have to move x for top tri 
						finalyOffset = yOffset + triHeightGlobal * Math.sqrt(3)/2;
						finalSize = triHeightGlobal * 2;
						sierpinskiDepth += 1;
						currentLayer += 1;
						if(triGroups[currentLayer-1] != null) {
							nextG = document.getElementById(triGroups[currentLayer-1].childNodes[1].getAttribute("data-transitiontarget"));
							if(nextG != null)triGroups[currentLayer] = nextG;
						}
						//trigger fade out on prev content - going forwards
						if(currentLayer != 1){
							triGroups[currentLayer-1].classList.remove("showContent");
							triGroups[currentLayer-1].classList.add("hideContent");
						}
						break;
					case TRIS.RIGHT: 
							finalxOffset = triXPos - triHeightGlobal;
							finalyOffset = yOffset - triHeightGlobal * Math.sqrt(3)/2;
							finalSize = triHeightGlobal * 2;
							sierpinskiDepth += 1;
							currentLayer += 1;
							if(triGroups[currentLayer-1] != null) {
								nextG = document.getElementById(triGroups[currentLayer-1].childNodes[3].getAttribute("data-transitiontarget"));
								if(nextG != null)triGroups[currentLayer] = nextG;
							}
							//trigger fade out on prev content - going forwards
							if(currentLayer != 1){
								triGroups[currentLayer-1].classList.remove("showContent");
								triGroups[currentLayer-1].classList.add("hideContent");
							}
						break;
					case TRIS.LEFT: 
							finalxOffset = triXPos + triHeightGlobal;
							finalyOffset = yOffset - triHeightGlobal * Math.sqrt(3)/2;
							finalSize = triHeightGlobal * 2;
							sierpinskiDepth += 1;
							currentLayer += 1;
							if(triGroups[currentLayer-1] != null) {
								nextG = document.getElementById(triGroups[currentLayer-1].childNodes[5].getAttribute("data-transitiontarget"));
								if(nextG != null)triGroups[currentLayer] = nextG;
							}
							//trigger fade out on prev content - going forwards
							if(currentLayer != 1){
								triGroups[currentLayer-1].classList.remove("showContent");
								triGroups[currentLayer-1].classList.add("hideContent");
							}
						break;
				}
               
				selectedInfoTri = 0;
				activeTriFill = 0;
				lastActiveTriFill = 0;
				transitionTimer = 0;
				isTransitioning = true;
				document.body.style.cursor = 'default';

			}
		}

		function updateMousePos(e){
			if(isTransitioning)return; //don't handle mouse move ui fx while transitioning
			//dont handle mosue move ui fx when panel is over cursor
			if (infoPanel.parentNode.querySelector(":hover") == infoPanel) {
					//Mouse is inside element
					activeTriFill = TRIS.NONE;
					document.body.style.cursor = 'default';
					return;
				} else {
					//Mouse is outside element
				}
			mouseX = e.clientX;
			mouseY = e.clientY;
			let p = {x: mouseX, y: mouseY};
			//now check if mouse has moved into any of the four tris: top, left, right, and center
			let centerx = canvas.width/2 + initialxOffset;
			let topy = canvas.height/2 + initialyOffset;
			let r = initialTriHeight;
			let h = initialTriHeight * (Math.sqrt(3)/2);

			let enteredATri = false;
			let freshEnter = false; //meaning going from 0->1 and not 1->1
			let leftATri = false;
			//center tri
			if(pointInsideTri(p, centerx - r/2, topy, centerx + r/2, topy, centerx, topy + Math.floor(initialTriHeight * Math.sqrt(3)/2))){
				if(activeTriFill == TRIS.NONE) freshEnter = true;
				enteredATri = true;
				activeTriFill = TRIS.CENTER;
			} else if(activeTriFill == TRIS.CENTER) { //if leaving tri
				leftATri = true;
			}
			//top tri
			topy = topy - Math.floor(initialTriHeight/2 * Math.sqrt(3)/2);
			if(pointInsideTri(p, centerx - r/4, topy, centerx + r/4, topy, centerx, topy + Math.floor(initialTriHeight/2 * Math.sqrt(3)/2))){
				if(activeTriFill == TRIS.NONE) freshEnter = true;
				enteredATri = true;
				activeTriFill = TRIS.TOP;
				// //check if tri element has associated content in the centerelement and display that
				// let centerElm = triGroups[currentLayer].querySelector(".centerTri");
				// let e = centerElm.querySelector(".topContent");
				// if(e != null && centerElm.querySelector(".activeCenter") != e){
				// 	console.log("setting center");
				// 	//hide prev active elm
				// 	centerElm.querySelector(".activeCenter").classList.add("notActive");
				// 	centerElm.querySelector(".activeCenter").classList.remove("activeCenter");
				// 	//display content
				// 	e.classList.remove("notActive");
				// 	e.classList.add("activeCenter");
				// }
			} else if(activeTriFill == TRIS.TOP) { //if leaving tri
				leftATri = true;
			}
			//right tri
			topy = topy + Math.floor(initialTriHeight* Math.sqrt(3)/2);
			centerx += initialTriHeight/2;
			if(pointInsideTri(p, centerx - r/4, topy, centerx + r/4, topy, centerx, topy + Math.floor(initialTriHeight/2 * Math.sqrt(3)/2))){
				if(activeTriFill == TRIS.NONE) freshEnter = true;
				enteredATri = true;
				activeTriFill = TRIS.RIGHT;
			} else if(activeTriFill == TRIS.RIGHT) { //if leaving tri
				leftATri = true;
			}
			//left tri
			//topy = topy + Math.floor(triHeightGlobal * Math.sqrt(3)/2);
			centerx -= initialTriHeight;
			if(pointInsideTri(p, centerx - r/4, topy, centerx + r/4, topy, centerx, topy + Math.floor(initialTriHeight/2 * Math.sqrt(3)/2))){
				if(activeTriFill == TRIS.NONE) freshEnter = true;
				enteredATri = true;
				activeTriFill = TRIS.LEFT;
			} else if(activeTriFill == TRIS.LEFT) { //if leaving tri
				leftATri = true;
			}

			//handling for entering and leaving tri
			if(enteredATri){
				if(freshEnter) {triFillAmt = 0; triFillTime = 0; highlightedLineProgress = lineProgress;}
				document.body.style.cursor = 'pointer';
				//override backfill if it is the same tri
				if(lastActiveTriFill == activeTriFill) lastActiveTriFill = 0;
			} else if(leftATri){
				lastActiveTriFill = activeTriFill;
				triFillBackAmt = triFillAmt; triFillBackTime = 0;
				activeTriFill = 0;
				triFillTime = 0;
				document.body.style.cursor = 'default';
			}

		}

		function pointInsideTri(p, c1x, c1y, c2x, c2y, c3x, c3y){
			//where pointX and pointY are the point to check and c1, c2, c3 are the corners of the triangle
			//do this by calculating the areas of pc1c2, pc2c3, pc1c3 and c1c2c3
			let A = areaOfTri(c1x, c1y, c2x, c2y, c3x, c3y);
			let A1 = areaOfTri(p.x, p.y, c2x, c2y, c3x, c3y);
			let A2 = areaOfTri(c1x, c1y, p.x, p.y, c3x, c3y);
			let A3 = areaOfTri(c1x, c1y, c2x, c2y, p.x, p.y);

			//console.log(c1x * c1y * c2x * c2y * c3x * c3y);
			return(A == (A1 + A2 + A3));

		}

		

		function createSierpinskiTriangle(depth, size, xoffset, yoffset){
            //stop if offscreen?
            


			//options
			//layers = number of times to recurse per tri (3 outside tris)
			//size = height of a single tri 
			//centered at the center of the page
			let centerx = canvas.width/2 + xoffset;
			let centery = canvas.height/2 + yoffset;
			let triHeight = size * (Math.sqrt(3)/2);
			let fill = false;
			//fill tris on final depth
			if(depth == 0)fill = true;

			//create top tri
			createEquilateralTriangle(centerx, centery - triHeight, size, fill);
			//create right tri
			createEquilateralTriangle(centerx + size/2, centery, size, fill);
			//create left tri
			createEquilateralTriangle(centerx - size/2, centery, size, fill);

			//recurse
			if(depth > 0){
			//top sierpinski
			createSierpinskiTriangle(depth - 1, size/2, xoffset, triHeight * -1/2 + yoffset);
			//right
			createSierpinskiTriangle(depth - 1, size/2, size/2 + xoffset, triHeight * 1/2  + yoffset);
			//left
			createSierpinskiTriangle(depth - 1, size/2, -size/2 + xoffset, triHeight * 1/2  + yoffset);
			}
		}

		function createEquilateralTriangle(X, Y, r, fill = true){ //where x and y are the center coord and r is the side length
            if(X > canvas.width || X < -canvas.width|| Y > canvas.height || Y < -canvas.height)return;
			let height = r * (Math.sqrt(3)/2);
			//decrement y by half of the height to point the given coord in the center
			//Y -= height/2;
			ctx.beginPath();
			ctx.moveTo(X, Y);
			ctx.lineTo(X+r/2, Y+height);
			ctx.lineTo(X-r/2, Y+height);
			ctx.lineTo(X, Y);
			if(fill){
				//because the Y value is the top of the tri, we want position handling to be done with the center so we decrement it
				Y += height/2;
				//set fill to be relative to the cursor's position
				let distRadius = 100;
				let defaultbVal = 20;
				let distfromtrix = Math.abs(X - mouseX);
				let distfromtriy = Math.abs(Y - mouseY);
				let bVal = defaultbVal;
				//if(distfromtrix < distRadius) {distfromtrix = Math.abs(distfromtrix - distRadius); bVal += ((distfromtrix * (255-defaultbVal)) / distRadius);} //convert to number out of 255
				//if(distfromtriy < distRadius) {distfromtriy = Math.abs(distfromtriy - distRadius); bVal += ((distfromtriy * (255-defaultbVal)) / distRadius);} //convert to number out of 255
				if(distfromtrix < distRadius && distfromtriy < distRadius){
					distfromtrix = Math.abs(distfromtrix - distRadius); //invert values of x and y to make coloring more appropriate
					distfromtriy = Math.abs(distfromtriy - distRadius);
					bVal += ((distfromtrix * (255-defaultbVal)) / distRadius);
					bVal += ((distfromtriy * (255-defaultbVal)) / distRadius);
				}
				ctx.fillStyle = `rgb(20, 20, ${bVal})`;

				ctx.fill();
			}
			else {
				ctx.lineWidth = 3;
				ctx.strokeStyle = "black";
				ctx.stroke();
			}
			ctx.closePath();
		}


		const fps = 60;
		const fpsInterval = 1000 / fps;

		let prev = performance.now();

		function animate(timestamp) {
			const elapsed = timestamp - prev;

			if(elapsed >  fpsInterval){
				prev = timestamp - (elapsed % fpsInterval);
				

				ctx.clearRect(0, 0, canvas.width, canvas.height);
				//colorsLoop();
				createSierpinskiTriangle(sierpinskiDepth, triHeightGlobal, triXPos, yOffset);
				//drawCenterTri(centerTriOn);
				handleTriFillOnHover();
				handleOutlineLoops();
				if(isTransitioning) handleTriTransition();
				handleSelectedTri();
				//flip when reaching the end to create a side-to-side motion
				// if(Math.abs(Math.abs(triXPos) - endX) <= 1 )leftToRight = !leftToRight;
				// if(Math.abs(Math.abs(colorYPos) - colorEnd) <= 1 )leftToRight = !leftToRight;

				//lerp timers
				time += 1;
				lineProgress += 0.003;
				highlightedLineProgress += 0.003;
				if(lineProgress > 1) lineProgress -= 1;
				if(highlightedLineProgress > 1) highlightedLineProgress -= 1;
			}
			requestAnimationFrame(animate);
		}

		function handleSelectedTri(){
			drawTri(selectedInfoTri, 150, true, false);
		}

		function handleTriTransition(){
			//console.log("transitioning... " + triHeightGlobal);
			triXPos = lerp(triXPos, finalxOffset, transitionTimer);
			yOffset = lerp(yOffset, finalyOffset, transitionTimer);
			triHeightGlobal = lerp(triHeightGlobal, finalSize, transitionTimer);
			depthSizeMult = lerp(depthSizeMult, currentLayer+1, transitionTimer);

            //transition html elements as well if they
            //if(triGroups[currentLayer] != null)positionTriGroup(triGroups[0], 0);
            //if(triGroups[currentLayer+1] != null)positionTriGroup(triGroups[currentLayer+1], currentLayer);
            //if(triGroups[currentLayer-1] != null)positionTriGroup(triGroups[currentLayer-1], currentLayer-1);
            //positionTriGroup(incomingTriGroup, 1);
			positionTriGroup(triGroups[0], false);

			transitionTimer += 0.005;
			if(transitionTimer >= .22){
				transitionTimer = 0;
				isTransitioning = false;
				//snap to finish
				triXPos = finalxOffset;
				yOffset = finalyOffset;
				triHeightGlobal = finalSize;
				depthSizeMult = currentLayer+1;
				//bring in the content
				let tgroup = triGroups[currentLayer];
				//console.log(tgroup);
				positionTriGroup(tgroup, true);
				if(currentLayer != 0){
					tgroup.classList.remove("hideContent");
					tgroup.classList.add("showContent");
				}
			}
		}

		function handleOutlineLoops(){
			//main groups; always visible
			//center tri
			//if(activeTriFill == TRIS.CENTER) {drawPartOfTri(highlightedLineProgress, canvas.width/2 + triXPos, canvas.height/2 + yOffset, triHeightGlobal);}
			drawPartOfTri(lineProgress, canvas.width/2 + triXPos, canvas.height/2 + yOffset, triHeightGlobal, 1);
			//top tri
			//if(activeTriFill == TRIS.TOP) {drawPartOfTri(highlightedLineProgress, canvas.width/2 + triXPos, canvas.height/2 + yOffset - (triHeightGlobal/2 * Math.sqrt(3)/2), triHeightGlobal/2);}
			drawPartOfTri(lineProgress, canvas.width/2 + triXPos, canvas.height/2 + yOffset - (triHeightGlobal/2 * Math.sqrt(3)/2), triHeightGlobal/2, 1);
			//right tri
			//if(activeTriFill == TRIS.RIGHT) {drawPartOfTri(highlightedLineProgress, canvas.width/2 + triXPos + triHeightGlobal/2, canvas.height/2 + yOffset + (triHeightGlobal/2 * Math.sqrt(3)/2), triHeightGlobal/2);}
			drawPartOfTri(lineProgress, canvas.width/2 + triXPos + triHeightGlobal/2, canvas.height/2 + yOffset + (triHeightGlobal/2 * Math.sqrt(3)/2), triHeightGlobal/2, 1);
			//left tri
			//if(activeTriFill == TRIS.LEFT) {drawPartOfTri(highlightedLineProgress, canvas.width/2 + triXPos - triHeightGlobal/2, canvas.height/2 + yOffset + (triHeightGlobal/2 * Math.sqrt(3)/2), triHeightGlobal/2);}
			drawPartOfTri(lineProgress, canvas.width/2 + triXPos - triHeightGlobal/2, canvas.height/2 + yOffset + (triHeightGlobal/2 * Math.sqrt(3)/2), triHeightGlobal/2,1 );

			//current group; displayed when not transitioning
			if(currentLayer == 1 && !isTransitioning && mainBranch != TRIS.TOP){
				//border type 1; move line around border
				//center tri
				//drawPartOfTri(lineProgress, canvas.width/2 + initialxOffset, canvas.height/2 + initialyOffset, initialTriHeight);
				//top tri
				drawPartOfTri(lineProgress, canvas.width/2 + initialxOffset, canvas.height/2 + initialyOffset - (initialTriHeight/2 * Math.sqrt(3)/2), initialTriHeight/2, .5);
				//right tri
				drawPartOfTri(lineProgress, canvas.width/2 + initialxOffset + initialTriHeight/2, canvas.height/2 + initialyOffset + (initialTriHeight/2 * Math.sqrt(3)/2), initialTriHeight/2, .5);
				//left tri
				drawPartOfTri(lineProgress, canvas.width/2 + initialxOffset - initialTriHeight/2, canvas.height/2 + initialyOffset + (initialTriHeight/2 * Math.sqrt(3)/2), initialTriHeight/2, .5);
			
			} else if((currentLayer == 2 || mainBranch == TRIS.TOP) && !isTransitioning){
				//border type 2; fade in and out full border
				let t = spike(time/100);
				triOpacityAmt = t;
				drawTri(TRIS.TOP, 5, true, true);
				drawTri(TRIS.RIGHT, 5, true, true);
				drawTri(TRIS.LEFT, 5, true, true);
				drawPartOfTri(lineProgress, canvas.width/2 + initialxOffset, canvas.height/2 + initialyOffset, initialTriHeight, .5);

			}
		}


		function handleTriFillOnHover(){
			//lerp hover fill
			triFillAmt = lerp(triFillAmt, 120, triFillTime);
			//backfill; un-fill 
			triFillBackAmt = lerp(triFillBackAmt, 0, triFillBackTime);
			
			drawTri(activeTriFill, triFillAmt, true, false);
			drawTri(lastActiveTriFill, triFillBackAmt, true, false);
			if(triFillTime <=1) triFillTime += 0.025;
			if(triFillBackTime <= 1) triFillBackTime += 0.025;

		}

		function drawCenterTri(on){
			let centerx = canvas.width/2 + triXPos;
			let topy = canvas.height/2 + yOffset;
			let triHeight = triHeightGlobal * (Math.sqrt(3)/2);

			ctx.beginPath();
			ctx.moveTo(centerx + triHeightGlobal/2, topy); //top right corner
			ctx.lineTo(centerx - triHeightGlobal/2, topy); //top left corner
			ctx.lineTo(centerx, topy + triHeight)//bottom point;
			ctx.lineTo(centerx + triHeightGlobal/2, topy);
			
			if(on){
				ctx.fillStyle = "white";
			} else {
				ctx.fillStyle = "black";
			}
			
			ctx.fill();
		}

        function positionTriGroup(tgroup, useInitial){
            let centerx = canvas.width/2, topy = canvas.height/2, r = triHeightGlobal, triHeight = r * Math.sqrt(3)/2;
            //let centerx = canvas.width/2, topy = canvas.height/2, r = triHeightGlobal, triHeight = r * Math.sqrt(3)/2;
            let yoff = yOffset, xoff = triXPos;
			if(useInitial){
				yoff = initialyOffset;
				xoff = initialxOffset;
				r = initialTriHeight;
				triHeight = r * Math.sqrt(3)/2;
				tgroup.style.fontSize = (r / 30) + "px";
			} else {
            	tgroup.style.fontSize =  (r/30) + "px";
			}
            // if(layer >= currentLayer){
            //     if(layer-1 <= 1){
            //         xoff = initialxOffset;
            //         yoff = initialyOffset;
            //         r = initialTriHeight;
            //         triHeight = r * Math.sqrt(3)/2;
            //     } else {
            //         xoff = stages[layer-1].xOff;
            //         yoff = stages[layer-1].yOff;
            //         r = stages[layer-1].size;
            //         triHeight = r * Math.sqrt(3)/2;
            //     }

            // } else {
            //     xoff = triXPos;
            //     yoff = yOffset;
            //     r = triHeightGlobal;
            //     triHeight = r * Math.sqrt(3)/2;
            // }

            //center tri
            let ctri = tgroup.childNodes[7];
            if(ctri == null)return;
            ctri.style.width = r/1.5 + "px";
            ctri.style.top = canvas.height/2 + yoff + r/8 + "px";
            ctri.style.left = canvas.width/2 + xoff - r/3 + "px";
            

            

            //top tri
            ctri = tgroup.childNodes[1];
            ctri.style.width = r/4 + "px";
            ctri.style.top = canvas.height/2 + yoff - Math.floor(r/2 * Math.sqrt(3)/2) + r/12 + "px";
            ctri.style.left = canvas.width/2 + xoff - r/8 + "px";
            //ctri.style.bottom = triHeight/2 + "px";

            //right tri
            ctri = tgroup.childNodes[3];
            ctri.style.width = r/4 + "px";
            ctri.style.top = canvas.height/2 + yoff + Math.floor(triHeight/2 * Math.sqrt(3)/2) + r/8 + "px";
            ctri.style.left = canvas.width/2 + xoff + r/2  - r/8 + "px";

            //left tri
            ctri = tgroup.childNodes[5];
            ctri.style.width = r/4 + "px";
            ctri.style.top = canvas.height/2 + yoff + Math.floor(triHeight/2 * Math.sqrt(3)/2) + r/8 + "px";
            ctri.style.left = canvas.width/2 + xoff - r/2  - r/8 + "px";

        }

		function drawTri(tri, fillamt, useInitial, strokeOnly){
			let centerx, topy, triHeight, r = triHeightGlobal;
			switch (tri){
				case TRIS.CENTER: 
				if(useInitial) {
						centerx = canvas.width/2 + initialxOffset;
						topy = canvas.height/2 + initialyOffset;
						triHeight = initialTriHeight * (Math.sqrt(3)/2);
						r = initialTriHeight;
				} else {
						centerx = canvas.width/2 + triXPos;
						topy = canvas.height/2 + yOffset;
						triHeight = triHeightGlobal * (Math.sqrt(3)/2);
				}
					break;
				case TRIS.TOP: 
					if(useInitial){
						centerx = canvas.width/2 + initialxOffset
						topy = canvas.height/2 + initialyOffset - Math.floor(initialTriHeight/2 * Math.sqrt(3)/2);
						triHeight = initialTriHeight/2 * (Math.sqrt(3)/2);
						r = initialTriHeight/2;
					} else {
						centerx = canvas.width/2 + triXPos;
						topy = canvas.height/2 + yOffset - Math.floor(triHeightGlobal/2 * Math.sqrt(3)/2);
						triHeight = triHeightGlobal/2 * (Math.sqrt(3)/2);
						r = r/2;
					}

					break;
				case TRIS.RIGHT: 
					if(useInitial){
						centerx = canvas.width/2 + initialxOffset + initialTriHeight/2;;
						topy = canvas.height/2 + initialyOffset + Math.floor(initialTriHeight/2 * Math.sqrt(3)/2);;
						triHeight = initialTriHeight/2 * (Math.sqrt(3)/2);
						r = initialTriHeight/2;
					} else {
						centerx = canvas.width/2 + triXPos + triHeightGlobal/2;;
						topy = canvas.height/2 + yOffset + Math.floor(triHeightGlobal/2 * Math.sqrt(3)/2);;
						triHeight = triHeightGlobal/2 * (Math.sqrt(3)/2);
						r = r/2;
					}

					break;
				case TRIS.LEFT: 
					if(useInitial){
						centerx = canvas.width/2 + initialxOffset - initialTriHeight/2;;
						topy = canvas.height/2 + initialyOffset + Math.floor(initialTriHeight/2 * Math.sqrt(3)/2);;
						triHeight = initialTriHeight/2 * (Math.sqrt(3)/2);
						r = initialTriHeight/2;
					} else {
						centerx = canvas.width/2 + triXPos - triHeightGlobal/2;;
						topy = canvas.height/2 + yOffset + Math.floor(triHeightGlobal/2 * Math.sqrt(3)/2);;
						triHeight = triHeightGlobal/2 * (Math.sqrt(3)/2);
						r = r/2;
					}
					break;
			}

			ctx.beginPath();
			ctx.moveTo(centerx + r/2, topy); //top right corner
			ctx.lineTo(centerx - r/2, topy); //top left corner
			ctx.lineTo(centerx, topy + triHeight)//bottom point;
			ctx.lineTo(centerx + r/2, topy);

			if(!strokeOnly){
				ctx.fillStyle = `rgb(${fillamt}, ${fillamt}, ${fillamt})`;
				if(tri == selectedInfoTri){
					ctx.fillStyle = `rgb(${0}, ${100}, ${150})`;
				}
				ctx.fill();
			} else {
				ctx.strokeStyle = `rgba(${0}, ${100}, ${150}, ${triOpacityAmt})`;
				ctx.lineWidth = fillamt;
				//ctx.stroke();

				//draw border on inside of shape rather than on the edge
				ctx.save();
				ctx.clip();
				ctx.lineWidth *= 2;
				//ctx.fill();
				ctx.stroke();
				ctx.restore();
			}

		}

		function drawPartOfTri(progress, centerx, topy, r, sizeMult){
			//progress is float between 0 and 1 representing the progress on the tri's path, where 0 is the top left corner, .33 the top right, .66 the bottom
			//assume point of tri is on bottom
			let width = .1; //amount of the path to draw before and after the progress point
			let startP = progress - width;
			if(startP < 0) startP += 1;
			let endP = progress + width;
			if(endP > 1) endP -= 1;
			ctx.beginPath();
			//check if a corner point will be needed
			if((startP < .33 && endP > .33) || ((startP < .66 && endP > .66)) || (startP > .66 && endP < .33)){
				let p1 = progressToCoord(startP, centerx, topy, r);
				ctx.moveTo(p1.x, p1.y);
				//get corner point
				let p2;
				if((startP < .33 && endP > .33)){
					//corner is top right
					p2 = {x: centerx + r/2, y: topy}
				} else if((startP < .66 && endP > .66)){
					//corner is bottom
					p2 = {x: centerx, y: topy + r * Math.sqrt(3)/2}
				} else {
					//corner is top left
					p2 = {x: centerx - r/2, y: topy}
				}
				ctx.lineTo(p2.x, p2.y);
				let p3 = progressToCoord(endP, centerx, topy, r);
				ctx.lineTo(p3.x, p3.y);
			} else {
				//otherwise, simple; just draw a line
				let p1 = progressToCoord(startP, centerx, topy, r);
				ctx.moveTo(p1.x, p1.y);
				let p2 = progressToCoord(endP, centerx, topy, r);
				ctx.lineTo(p2.x, p2.y);
				
			}
			ctx.strokeStyle = borderGradient;
			ctx.lineWidth = 5 * depthSizeMult * sizeMult;
			ctx.stroke();
		}

		function progressToCoord(progress, centerx, topy, r){
			let h = r * Math.sqrt(3)/2;
			if(progress < .33){
				//top side
				let p = {x: (centerx - r/2) + (r * progress/.33), y: topy}
				return p;
			} else if(progress < .66){
				//bottom right side
				let p = {x: (centerx + r/2) - (r/2 * (progress-.33)/.33), y: topy + (h * (progress-.33)/.33)}
				return p;
			} else {
				//bottom left side 
				let p = {x: (centerx) - (r/2 * (progress-.66)/.34), y: (topy+h) - (h * (progress-.66)/.34)}
				return p;
			}
		}


		var cduration = 1000; //length in increments of animate loop calls
		function colorsLoop(){
			colorYPos = lerp(0, canvas.height, spike(time/cduration));
		}

		function lerp(start, end, t) {
			return start + (end - start) * t; // Equivalent formula to (1 - t) * start + t * end
		}

		function spike(t) {
			if (t % 1 <= .5) return EaseIn(t % 1 / .5);
 
    		return EaseIn(Flip(t)/.5);
		}

		function Flip(x) {
			return 1 - x % 1;
		}

		function EaseIn(t)
		{
			return t * t;
		}

		//misc helpers

		function areaOfTri(x1, y1, x2, y2, x3, y3){
			return Math.abs((x1*(y2-y3) + x2*(y3-y1)+ x3*(y1-y2))/2.0); 
		}
