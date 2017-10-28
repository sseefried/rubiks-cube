(function(){
    'use strict';

    /** a Rubik's cubelet made with WebGL
     *
     * @link https://github.com/blonkm/rubiks-cubelet
     * @authors
     *      Tiffany Wang - https://github.com/tinnywang
     *      Michiel van der Blonk - blonkm@gmail.com
     * @license LGPL
     */
  var GLube = function() {
    var canvas;
    var gl;
    var rubiksCube;
    var shaderProgram;

    var rightMouseDown = false;
    var x_init_right;
    var y_init_right;
    var x_new_right;
    var y_new_right;
    var leftMouseDown = false;
    var init_coordinates;
    var new_coordinates;
    var isRotating = false;
    var isAnimating = false;
    var isInitializing = true;
    var eye = [0, 0, -20];
    var center = [0, 0, 0];
    var up = [0, 1, 0];
    var fov = -19.5;

    var modelViewMatrix  = mat4.create();
    var projectionMatrix = mat4.create();
    var rotationMatrix   = mat4.create();

    this.modelViewMatrix  = modelViewMatrix;
    this.projectionMatrix = projectionMatrix;
    this.rotationMatrix   = rotationMatrix

    var ctrlPressed = false;
    var publisher   = null;

    var that = this;

    var DEGREES = 6;
    var MARGIN_OF_ERROR = 1e-3;

    var LEFT_MOUSE = 0;
    var RIGHT_MOUSE = 2;
    var CANVAS_X_OFFSET = 0;
    var CANVAS_Y_OFFSET = 0;

    // Enumeration for cubelet sort
    var CUBE_SORTS = { Rubiks: 0,  MirrorBlocks: 1 };

    function setIsRotating(val) {
      isRotating = val;
    }

    /*
     *  A programmatic way to turn the cube
     */
    function turn(cubeletIndices, rotation) {
      rubiksCube.selectedCubeletIndices = cubeletIndices;
      rubiksCube.rotation = rotation;
      rubiksCube.setRotatedCubelets();
      setIsRotating(true);
    }

    function RubiksCube(glube, cubeSort) {
        this.glube = glube;
        this.selectedCubeletIndices = [];// an instance of
        this.rotatedCubelets = null; // an array of cubelets

        this.rotation = null;

        this.rotationAngle = 0;
        this.degrees = DEGREES;
        this.cubeletModels = null;
        this.normalsCube = new NormalsCube();
        this.cubelets = new Array(3);
        this.noMove = {face:'', count:0, inverse:false};
        this.currentMove = {face:'', count:0, inverse:false};
        this.pickingFramebuffer = null;
        this.pickingTexture = null;
        this.pickingRenderBuffer = null;
        this.cubeSort = cubeSort;

        this.init = function() {
            var r,g,b;
            var coordinates;
            var index;
            var selectorColor;

            this.initTextureFramebuffer();
            this.initCubeletModels(cubeSort);


            for (var r = 0; r < 3; r++) {
                this.cubelets[r] = new Array(3);
                for (var g = 0; g < 3; g++) {
                    this.cubelets[r][g] = new Array(3);
                    for (var b = 0; b < 3; b++) {

                        index = { x: r - 1, y: g - 1, z: b - 1 };
                        coordinates = this.centerOfCubeletAtIndex(index);

                        selectorColor = [ r / 3, g / 3, b / 3, 1.0];
                        this.cubelets[r][g][b] =
                          new Cubelet(
                                this,
                                this.cubeletModels[r][g][b],
                                coordinates,
                                index,
                                selectorColor
                                );
                    }
                }
            }
            this.initCenters();
        }

        this.centerOfCubeletAtIndex = function(index) {
            var models = this.cubeletModels;
            var ix = index.x, iy = index.y, iz = index.z;
            var i = ix + 1, j = iy + 1, k = iz + 1;

            /*
             * Each of these functions returns the length
             * (in dimension x or y or z) for a given cubelet model
             * where a is either -1, 0, 1
             */
            var xLenSelector =
                  function(a) { return models[a+1 ][j   ][k   ].size.x };
            var yLenSelector =
                  function(a) { return models[i   ][a+1 ][k   ].size.y };
            var zLenSelector =
                  function(a) { return models[i   ][j   ][a+1 ].size.z };

            /* 'a' varies between -1,0,1 */
            var coordFor = function(a, lenSelector) {
              if (a == -1) {
                return (- (lenSelector(0)/2 + lenSelector(-1)/2));
              } else if (a == 0) {
                return 0;
              } else { // a == 1
                return (lenSelector(0)/2 + lenSelector(1)/2);
              }
            };


          return [ coordFor(ix, xLenSelector),
                   coordFor(iy, yLenSelector),
                   coordFor(iz, zLenSelector)
                 ]
        }

        this.initTextureFramebuffer = function() {
            this.pickingFramebuffer = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.pickingFramebuffer);

            this.pickingTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.pickingTexture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

            this.pickingRenderBuffer = gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, this.pickingRenderBuffer);
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, canvas.width, canvas.height);

            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.pickingTexture, 0);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.pickingRenderBuffer);
        }


        this.initCubeletModels = function(cubeSort) {
          var i,j,k;
          this.cubeletModels = new Array(3);
          for (var i = 0; i < 3; i++) {
            this.cubeletModels[i] = new Array(3);
            for (var j = 0; j < 3; j++) {
              this.cubeletModels[i][j] = new Array(3);
              for (var k = 0; k < 3; k++) {

                if ( cubeSort == CUBE_SORTS.MirrorBlocks ) {
                  this.cubeletModels[i][j][k] =
                    mirrorBlocksCubeletModels[i][j][k];
                } else { // default is CUBE_SORTS.MirrorBlocks
                    this.cubeletModels[i][j][k] = rubiksCubeletModel;
                }
              }
            }
          }
        }

        this.initCenters = function() {
            this.centerCubes = {
                left:   {r: 1, g: 1, b: 2 },
                right:  {r: 1, g: 1, b: 0 },
                up:     {r: 1, g: 0, b: 1 },
                down:   {r: 1, g: 2, b: 1 },
                front:  {r: 0, g: 1, b: 1 },
                back:   {r: 2, g: 1, b: 1 },
                core:   {r: 1, g: 1, b: 1 }
            }
        }

        this.init();

        this.draw = function() {
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            mat4.perspective(projectionMatrix, fov, canvas.width / canvas.height, 0.1, 100.0);
            mat4.identity(modelViewMatrix);
            mat4.lookAt(modelViewMatrix, eye, center, up);
            mat4.multiply(modelViewMatrix, modelViewMatrix, rotationMatrix);
            var mvMatrix = mat4.create();
            for (var r = 0; r < 3; r++) {
                for (var g = 0; g < 3; g++) {
                    for (var b = 0; b < 3; b++) {
                        var cubelet = this.cubelets[r][g][b];
                        // Overwrite the selectorColor
                        cubelet.draw(this.cubeletModels[r][g][b].blockModel.ambient);
                        for (var s in cubelet.stickers) {
                            cubelet.stickers[s].draw();
                        }
                    }
                }
            }
        }

        this.drawToPickingFramebuffer = function() {
            gl.bindFramebuffer(gl.FRAMEBUFFER, rubiksCube.pickingFramebuffer);
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.uniform1i(shaderProgram.lighting, 0);

            mat4.perspective(projectionMatrix, fov, canvas.width / canvas.height, 0.1, 100.0);
            mat4.identity(modelViewMatrix);
            mat4.lookAt(modelViewMatrix, eye, center, up);
            mat4.multiply(modelViewMatrix, modelViewMatrix, rotationMatrix);
            var mvMatrix = mat4.create();
            for (var r = 0; r < 3; r++) {
                for (var g = 0; g < 3; g++) {
                    for (var b = 0; b < 3; b++) {
                        var cubelet = this.cubelets[r][g][b];
                        cubelet.draw(cubelet.selectorColor);
                    }
                }
            }

            gl.uniform1i(shaderProgram.lighting, 1);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }

        this.drawToNormalsFramebuffer = function() {
            gl.bindFramebuffer(gl.FRAMEBUFFER, rubiksCube.normalsCube.normalsFramebuffer);
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            mat4.perspective(projectionMatrix, fov, canvas.width / canvas.height, 0.1, 100.0);
            mat4.identity(modelViewMatrix);
            mat4.lookAt(modelViewMatrix, eye, center, up);
            mat4.multiply(modelViewMatrix, modelViewMatrix, rotationMatrix);
            var mvMatrix = mat4.create();
            mat4.copy(mvMatrix, modelViewMatrix);
            this.normalsCube.draw();

            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }

        /*
         * Sets this.rotatedCubelets to an array of cubelets that share the
         * same AXIS coordinate as this.selectedCubeletIndices.
         * AXIS is 0, 1, or 2 for the x-, y-, or z-coordinate.
         */
        this.setRotatedCubelets = function(move) {
            if (this.rotation == undefined) {
                return;
            }

            var axis = this.rotation.axis;
            var cubelets = [];
            this.selectedCubeletIndices.forEach(function(idx) {
                if (idx) {
                    var el = this.cubelets[idx.r][idx.g][idx.b];
                    var value = el.index[axis];
                    for (var r = 0; r < 3; r++) {
                        for (var g = 0; g < 3; g++) {
                            for (var b = 0; b < 3; b++) {
                                var cubelet = this.cubelets[r][g][b];
                                if (Math.abs(cubelet.index[axis] - value) < MARGIN_OF_ERROR) {
                                  cubelets.push(cubelet);
                                }
                            }
                        }
                    }
                }
            }, this);

            if (cubelets.length >= 9) {
                this.rotatedCubelets = cubelets;
                // is this a slice layer?
                var i;
                var that = this;
                cubelets.forEach(function(cubelet, i, cubelets) {
                    if (cubelet.stickers.length==0) {
                      var slices = { x: 'S', y: 'E', z: 'M' }; //x,y,z
                      var slice = slices[that.rotation.axis];
                      var rotationAxis = that.getRotationAxis();
                      var x = rotationAxis[0];
                      var y = rotationAxis[1];
                      var z = rotationAxis[2];
                      var sum = x+y+z;
                      var inverse = false;
                      inverse |= slice=='M' && sum==1;
                      inverse |= slice=='E' && sum==1;
                      inverse |= slice=='S' && sum==-1; // silly cubelet notation
                      // update centers for slice moves
                      var m = (move===undefined) ? 1 : move.count;
                      while (m-- >0) {
                        that.updateCenters(slice, inverse);
                      }
                    }
                });
            }
        }

        this.getRotationAxis = function() {
         var rot = {
            "x": { "cw":  [1 , 0, 0],
                   "ccw": [-1, 0, 0] },
            "y": { "cw":  [ 0, 1, 0],
                   "ccw": [ 0,-1, 0] },
            "z": { "cw":  [ 0, 0, 1],
                   "ccw": [ 0, 0,-1] }
          };

          if (this.rotation == undefined) {
            return undefined;
          }
          return rot[this.rotation.axis][this.rotation.dir];
        }

        /*
         * Rotates this.rotatedCubelets around this.rotation by this.degrees.
         */
        this.rotateLayer = function(isDouble) {
            var fullTurn = isDouble ? 180 : 90;
            if (Math.abs(this.rotationAngle) == fullTurn) {
                this.rotationAngle = 0;
                isRotating = false;
                isAnimating = false;
                this.degrees = isInitializing ? fullTurn: DEGREES;
                return;
            }

            if (!isInitializing)
                this.degrees = 3 + DEGREES * $.easing.easeOutExpo(0, this.rotationAngle, 0, 1, fullTurn);
            if (this.rotationAngle + this.degrees > fullTurn) {
                this.degrees = fullTurn - this.rotationAngle;
                this.rotationAngle = fullTurn;
            }
            else {
                this.rotationAngle += this.degrees;
            }

            var newRotationMatrix = mat4.create();
            mat4.rotate(newRotationMatrix, newRotationMatrix,
                        degreesToRadians(this.degrees), this.getRotationAxis());


            for (var c in this.rotatedCubelets) {
                var cubelet = this.rotatedCubelets[c];

                var itoc = function(index) { // index to coords
                  return [ index.x, index.y, index.z ];
                }

                var ctoi = function(coords) { // coords to index
                  return { x: coords[0], y: coords[1], z: coords[2]};
                }

                var indexVec = itoc(cubelet.index);
                // vec3.transformMat4 updates its first argument
                vec3.transformMat4(indexVec, itoc(cubelet.index), newRotationMatrix);
                mat4.multiply(cubelet.rotationMatrix, newRotationMatrix, cubelet.rotationMatrix);
                cubelet.index = ctoi(indexVec); // update index
            }
        }

        this.selectorColorToCubeletIndex = function(rgba) {
            var r = rgba[0];
            var g = rgba[1];
            var b = rgba[2];
            if (r == 255 && g == 255 && b == 255) { // clicked outside the cubelet
                return null;
            } else {
                return { r: r % 3, g: g % 3, b: b % 3 };
            }
        }

        this.getSelectedCubeletIndex = function(x, y) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.pickingFramebuffer);
            var pixelValues = new Uint8Array(4);
            gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelValues);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            return this.selectorColorToCubeletIndex(pixelValues)
        }

        this.getRotation = function(x, y, direction) {
            var rotation;
            var normal = this.normalsCube.getNormal(x, y);
            if (!normal) {
                return;
            }
            var axis = vec3.create();
            vec3.cross(axis, normal, direction);
            var x = Math.round(axis[0]);
            var y = Math.round(axis[1]);
            var z = Math.round(axis[2]);

            if ( Math.abs(x + y + z) != 1 ) {
              return null;
            }

            if (x == 1) {
              rotation = { axis: "x", dir: "cw" };
            } else if (x == -1) {
              rotation = { axis: "x", dir: "ccw" };
            } else if (y == 1) {
              rotation = { axis: "y", dir: "cw" };
            } else if (y == -1) {
              rotation = { axis: "y", dir: "ccw" };
            } else if (z == 1)   {
              rotation = { axis: "z", dir: "cw" };
            } else if (z == -1 ) {
              rotation = { axis: "z", dir: "ccw" };
            }
            return rotation;
        }

        /*
         * For testing the rotation of a layer by matrix instead of layer.
         * Repeatedly called by doTransform to turn layer by this.degrees until 90 degrees is done
         */
        this.transform = function(r,g,b, rotation, inverse) {
            var rot = [
                { axis: "x", dir: "cw" },
                { axis: "y", dir: "cw" },
                { axis: "z", dir: "cw" },
            ];


            // FIXME: Replace with a call to "turn"
            this.selectedCubeletIndices.push({ r: r, g :g, b: b });
            this.rotation = rotation;
            this.setRotatedCubelets();
            isRotating = true;
        }

        /*
         * For testing only: timed transform of the cubelet, rotating a layer
         */
        this.doTransform = function(params) {
            var that = this;
            var delay = 50;
            if (!isRotating) {
                var move = params.shift();
                this.transform(move.r, move.g, move.b, move.axis);
                setTimeout(function() {that.doTransform(params)}, delay);
            }
            else
                if (params.length > 0)
                    setTimeout(function() {that.doTransform(params)}, delay);
        }

        this.centerColors = {
            left:   'blue',
            right:  'green',
            up:     'yellow',
            down:   'white',
            front:  'red',
            back:   'orange',
            core:   'black'
        }

        /* rotate defined centers with a slice layer */
        this.updateCenters = function(layer, inverse) {
            var c=this.centerCubes;
            var centers = {
                'M': {
                    left:   c.left,
                    right:  c.right,
                    up:     c.back,
                    down:   c.front,
                    front:  c.up,
                    back:   c.down
                },
                'E': {
                    left:   c.back,
                    right:  c.front,
                    up:     c.up,
                    down:   c.down,
                    front:  c.left,
                    back:   c.right
                },
                'S': {
                    left:   c.down,
                    right:  c.up,
                    up:     c.left,
                    down:   c.right,
                    front:  c.front,
                    back:   c.back
                }
            };
            var centersInverse = {
                'M': {
                    left:   c.left,
                    right:  c.right,
                    up:     c.front,
                    down:   c.back,
                    front:  c.down,
                    back:   c.up
                },
                'E': {
                    left:   c.front,
                    right:  c.back,
                    up:     c.up,
                    down:   c.down,
                    front:  c.right,
                    back:   c.left
                },
                'S': {
                    left:   c.up,
                    right:  c.down,
                    up:     c.right,
                    down:   c.left,
                    front:  c.front,
                    back:   c.back
                },
            };
            if (centers[layer])
            {
                if (inverse==true)
                    this.centerCubes = centersInverse[layer];
                else
                    this.centerCubes = centers[layer];
                this.centerCubes.core = { r: 1, g: 1, b: 1};
            }
        }

        this.move = function(move) {
            var inverse = typeof move.inverse !== 'undefined' ? move.inverse : false;
            var L = this.centerCubes.left;
            var R = this.centerCubes.right;
            var U = this.centerCubes.up;
            var D = this.centerCubes.down;
            var F = this.centerCubes.front;
            var B = this.centerCubes.back;
            var C = this.centerCubes.core;

            var inverseAxisConstant = function(r) {
              return { axis: r.axis, dir: (r.dir == "cw" ? "ccw" : "cw") };
            }

            var layers = {
                "L": {cubies:[L], rotation: { axis: "z", dir: "ccw"} },
                "R": {cubies:[R], rotation: { axis: "z", dir: "cw" } },

                "U": {cubies:[U], rotation: { axis: "y", dir: "cw"} },
                "D": {cubies:[D], rotation: { axis: "y", dir: "ccw"} },

                "F": {cubies:[F], rotation: { axis: "x", dir: "cw"} },
                "B": {cubies:[B], rotation: { axis: "x", dir: "ccw"} },

                // use center of cubelet for slices
                "M": {cubies:[C], rotation: { axis: "z", dir: "ccw"} },
                "E": {cubies:[C], rotation: { axis: "y", dir: "ccw"} },
                "S": {cubies:[C], rotation: { axis: "x", dir: "cw"} },

                "l": {cubies:[L,C], rotation: { axis: "z", dir: "ccw"} },
                "r": {cubies:[R,C], rotation: { axis: "z", dir: "cw"} },

                "u": {cubies:[U,C], rotation: { axis: "y", dir: "cw"} },
                "d": {cubies:[D,C], rotation: { axis: "y", dir: "ccw"}},

                "f": {cubies:[F,C], rotation: { axis: "x", dir: "cw"}},
                "b": {cubies:[B,C], rotation: { axis: "x", dir: "ccw"} },

                "x": {cubies:[L,C,R], rotation: { axis: "z", dir: "cw"} },
                "y": {cubies:[U,C,D], rotation: { axis: "y", dir: "cw"}},
                "z": {cubies:[F,C,B], rotation: { axis: "x", dir: "cw"} }
            };


            var baseAxisConstant = layers[move.face].rotation;
            var rotation =
              move.inverse ? inverseAxisConstant(baseAxisConstant)
                           : baseAxisConstant;
            this.selectedCubeletIndices = layers[move.face].cubies;
            this.rotation               = rotation;
            this.setRotatedCubelets(move);
            isRotating = true;
        }

        this.perform = function(alg) {
            var that = this;
            var delay = 10;
            if (!isRotating && alg.length > 0) {
                isAnimating = true;
                var clone = alg.slice(0);
                var move = clone.shift();
                if (!move.count)
                    move.count = 1;
                    this.move(move);
                this.currentMove = move;
                that.setNormals = 'MESxyz'.match(move.face)!=null;
                setTimeout(function() {that.perform(clone)}, delay);
            }
            else {
                if (alg.length > 0) {
                    setTimeout(function() {that.perform(alg)}, delay);
                } else {
                  isInitializing = false;
                }
            }
        }

        this.moveListToString = function(moveList) {
            return moveList.map(function(move) {
              return move.face + (move.count==2?"2":"") + (move.inverse?"'":"");
            }).join(" ");
        }

        this.inverseMoveList = function(moves) {
            return moves.reverse().map(function(move) {
              return {face:move.face, count:move.count, inverse:!move.inverse};
            });
        }

        this.setStickers = function(stickers) {
            var positions = "FUL,FU,FUR,FL,F,FR,FDL,FD,FDR,RFU,RU,RBU,RF,R,RB,RFD,RD,RBD,DLF,DF,DRF,DL,D,DR,DLB,DB,DRB,BUR,BU,BUL,BR,B,BL,BDR,BD,BDL,LBU,LU,LFU,LB,L,LF,LBD,LD,LFD,ULB,UB,URB,UL,U,UR,ULF,UF,URF".split(',');

            var colors = {
                r:'red',
                g:'green',
                w:'white',
                o:'orange',
                b:'blue',
                y:'yellow',
                x:'gray',
                k:'black' //key (from CMYK)
            };
            var r,g,b;
            var cubelet;
            var x,y,z;
            var position;

            var arrayRotate = function(arr, reverse){
              if(reverse)
                arr.push(arr.shift());
              else
                arr.unshift(arr.pop());
              return arr;
            }

            for (var r = 0; r < 3; r++) {
                for (var g = 0; g < 3; g++) {
                    for (var b = 0; b < 3; b++) {
                        cubelet = this.cubelets[r][g][b];
                        x = cubelet.index.x;
                        y = cubelet.index.y;
                        z = cubelet.index.z;
                        var faces=[];
                        if (x === -1) faces.push('F'); else if (x === 1) faces.push('B');
                        if (y === -1) faces.push('U'); else if (y === 1) faces.push('D');
                        if (z === -1) faces.push('R'); else if (z === 1) faces.push('L');
                        // faces.length=1 => center
                        // faces.length=2 => edge
                        // faces.length=3 => corner
                        position = faces;
                        faces.forEach(function(value, key) {
                            var index = positions.indexOf(position.join(''));
                            var ch;
                            if (stickers.length >= index+1) {
                                ch = stickers.slice(index, index+1);
                                if (!"rgbwoyxk".match(ch)) {
                                    ch = 'x';
                                }
                            }
                            else {
                                ch = 'x';
                            }

                            var el = cubelet.stickers[key];
                            var cr = parseInt(el.color[0]*255.0);
                            var cg = parseInt(el.color[1]*255.0);
                            var cb = parseInt(el.color[2]*255.0);
                            cubelet.stickers[key].color = cubelet.COLORS[colors[ch]];
                            position = arrayRotate(position, true);
                        });

                        }
                    }
                }
            };


        this.reset = function() {
            this.init();
            var alg = $(canvas).data('alg');
            var algType = $(canvas).data('type');
            // default order of RubikPlayer faces is F, R, D, B, L, U
            // we start with yellow on top
            var defaultStickers = "rrrrrrrrrgggggggggwwwwwwwwwooooooooobbbbbbbbbyyyyyyyyy";
            var stickers = $(canvas).data('stickers') || defaultStickers;
            var stickerSets = {
                BLANK:    "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                CROSS:    "xxxxrxxrxxxxxgxxgxxwxwwwxwxxxxxoxxoxxxxxbxxbxxxxxyxxxx",
                FL:       "xxxxxxrrrxxxxxxgggwwwwwwwwwxxxxxxoooxxxxxxbbbxxxxxxxxx",
                F2L:      "xxxrrrrrrxxxggggggwwwwwwwwwxxxooooooxxxbbbbbbxxxxyxxxx",
                SHORTCUT: "xxxxrrxrrxxxggxggxxwwwwwxwxxxxxoxxoxxxxxbxxbxxxxxyxxxx",
                OLL:      "xxxrrrrrrxxxggggggwwwwwwwwwxxxooooooxxxbbbbbbyyyyyyyyy",
                PLL:      "rrrxxxxxxgggxxxxxxxxxxxxxxxoooxxxxxxbbbxxxxxxyyyyyyyyy",
                FULL:     defaultStickers
            };
            // replace stickers by full definition of set
            if (stickerSets[stickers.toUpperCase()]) {
                stickers = stickerSets[stickers.toUpperCase()];
            }
            this.setStickers(stickers);
            perspectiveView();
            if (alg) {
                this.degrees = 90;
                $(canvas).parent().find('.algorithm').val(alg);
                var moves = parseAlgorithm(alg);
                if (algType === 'solver') {
                  isInitializing = true;
                  moves = this.inverseMoveList(moves);
                  doAlgorithm(moves);
                } else {
                  isInitializing = false;
                }
            } else {
                isInitializing = false;
            }
        };

    }

    /*
     * Note:
     *  The selectorColor is not a real color. It's a hack. It is used by
     *  selectorColorToCubelet to determine, for a given mouse (x,y), which
     *  cubelet has been selected.
     */
    function Cubelet(rubiksCube, cubeletModel, coordinates, index, selectorColor) {
        this.model = cubeletModel;
        this.selectorColor = selectorColor; // Hacky


        this.cubeVerticesBuffer = null;
        this.cubeNormalsBuffer  = null;
        this.cubeFacesBuffer    = null;

        this.stickerVerticesBuffers = { xy: null, xz: null, yz: null};
        this.stickerNormalsBuffers  = { xy: null, xz: null, yz: null};
        this.stickerFacesBuffers    = { xy: null, xz: null, yz: null};

        this.rubiksCube = rubiksCube;

        this.coordinates = coordinates;
        /*
         * The index represents which of the 27 cubelets we are talking about
         * Each dimension is either -1, 0, or 1
         */
        this.index = index;

        this.rotationMatrix = mat4.create();
        this.translationVector = vec3.create();
        this.stickers = [];
        this.COLORS = {
            'blue':   [0.1, 0.1, 1.0, 1.0],
            'green':  [0.1, 0.7, 0.1, 1.0],
            'orange': [1.0, 0.5, 0.0, 1.0],
            'red':    [0.8, 0.1, 0.1, 1.0],
            'white':  [1.0, 1.0, 1.0, 1.0],
            'yellow': [1.0, 1.0, 0.1, 1.0],
            'gray':   [0.5, 0.5, 0.5, 1.0],
            'black':  [0.0, 0.0, 0.0, 1.0]
        }

        this.init = function() {
            this.initCubeBuffers();
            this.initStickerBuffers();

            vec3.scale(this.translationVector, this.coordinates, 2);
            this.initStickers(); // initialise the six stickers for this cubelet
        }

        this.initStickers = function() {
            var ix = this.index.x;
            var iy = this.index.y;
            var iz = this.index.z;
            /* x-axis, the YZ stickers */
            if (ix == -1) {
                this.stickers.push(new Sticker(this, "yz", this.COLORS['red'], function() {
                    this.cubelet.transform();
                    mat4.translate(modelViewMatrix, modelViewMatrix,
                      [-(this.cubelet.model.size.x + MARGIN_OF_ERROR), 0, 0]);
                    mat4.rotateZ(modelViewMatrix, modelViewMatrix, degreesToRadians(90));
                }));
            } else if (ix == 1) {
                this.stickers.push(new Sticker(this, "yz", this.COLORS['orange'], function() {
                    this.cubelet.transform();
                    mat4.translate(modelViewMatrix, modelViewMatrix,
                      [(this.cubelet.model.size.x + MARGIN_OF_ERROR), 0, 0]);
                    mat4.rotateZ(modelViewMatrix, modelViewMatrix, degreesToRadians(-90));
                }));
            }

            /* y-axis, the XZ stickers */
            if (iy == -1) {
                this.stickers.push(new Sticker(this, "xz", this.COLORS['yellow'], function() {
                    this.cubelet.transform();
                    mat4.translate(modelViewMatrix, modelViewMatrix,
                      [0, -(this.cubelet.model.size.y + MARGIN_OF_ERROR), 0]);
                    mat4.rotateX(modelViewMatrix, modelViewMatrix, degreesToRadians(-180));
                }));
            } else if (iy == 1) {
                this.stickers.push(new Sticker(this, "xz", this.COLORS['white'], function() {
                    this.cubelet.transform();
                    mat4.translate(modelViewMatrix, modelViewMatrix,
                      [0, (this.cubelet.model.size.y + MARGIN_OF_ERROR), 0]);
                    setMatrixUniforms();
                }));
            }

            /* z-axis, the XY stickers */
            if (iz == -1) {
                this.stickers.push(new Sticker(this, "xy", this.COLORS['green'], function() {
                    this.cubelet.transform();
                    mat4.translate(modelViewMatrix, modelViewMatrix,
                      [0, 0, -(this.cubelet.model.size.z + MARGIN_OF_ERROR)]);
                    mat4.rotateX(modelViewMatrix, modelViewMatrix, degreesToRadians(-90));
                }));
            } else if (iz == 1) {
                this.stickers.push(new Sticker(this, "xy", this.COLORS['blue'], function() {
                    this.cubelet.transform();
                    mat4.translate(modelViewMatrix, modelViewMatrix,
                      [0, 0, (this.cubelet.model.size.z + MARGIN_OF_ERROR)]);
                    mat4.rotateX(modelViewMatrix, modelViewMatrix, degreesToRadians(90));
                }));
            }
        }


        this.transform = function() {
            mat4.multiply(modelViewMatrix, modelViewMatrix, this.rotationMatrix);
            mat4.translate(modelViewMatrix, modelViewMatrix, this.translationVector);
        }

        this.initCubeBuffers = function() {
            // vertices
            this.cubeVerticesBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeVerticesBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cubeletModel.blockModel.vertices), gl.STATIC_DRAW);
            // normals
            this.cubeNormalsBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeNormalsBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cubeletModel.blockModel.normals), gl.STATIC_DRAW);
            // faces
            this.cubeFacesBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.cubeFacesBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeletModel.blockModel.faces), gl.STATIC_DRAW);
        }

        this.initStickerBuffers = function() {
            var idx = [ "yz", "xz", "xy"], i, stickerIdx;

            for (i = 0; i < idx.length; i++) {
              stickerIdx = idx[i];
              // vertices
              this.stickerVerticesBuffers[stickerIdx] = gl.createBuffer();
              gl.bindBuffer(gl.ARRAY_BUFFER, this.stickerVerticesBuffers[stickerIdx]);
              gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cubeletModel.stickerModels[stickerIdx].vertices), gl.STATIC_DRAW);
              // normals
              this.stickerNormalsBuffers[stickerIdx] = gl.createBuffer();
              gl.bindBuffer(gl.ARRAY_BUFFER, this.stickerNormalsBuffers[stickerIdx]);
              gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cubeletModel.stickerModels[stickerIdx].normals), gl.STATIC_DRAW);
              // faces
              this.stickerFacesBuffers[stickerIdx] = gl.createBuffer();
              gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.stickerFacesBuffers[stickerIdx]);
              gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeletModel.stickerModels[stickerIdx].faces), gl.STATIC_DRAW);
            }
        }

        this.draw = function(color) {
            var mvMatrix = mat4.create();
            mat4.copy(mvMatrix, modelViewMatrix);
            this.transform();
            setMatrixUniforms();

            gl.uniform4fv(shaderProgram.ambient,  color);
            gl.uniform4fv(shaderProgram.diffuse,  cubeletModel.blockModel.diffuse);
            gl.uniform4fv(shaderProgram.specular, cubeletModel.blockModel.specular);
            gl.uniform1f(shaderProgram.shininess, cubeletModel.blockModel.shininess);
            // vertices
            gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeVerticesBuffer);
            gl.vertexAttribPointer(shaderProgram.vertexPosition, 3, gl.FLOAT, false, 0, 0);
            // normals
            gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeNormalsBuffer);
            gl.vertexAttribPointer(shaderProgram.vertexNormal, 3, gl.FLOAT, false, 0, 0);
            // faces
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.cubeFacesBuffer);
            gl.drawElements(gl.TRIANGLES, cubeletModel.blockModel.faces.length, gl.UNSIGNED_SHORT, 0);

            mat4.copy(modelViewMatrix, mvMatrix);
        }

        this.init();

    }

    /* stickerIdx is "yz", "xz", or "xy" */
    function Sticker(cubelet, stickerIdx, color, transform) {
        this.cubelet = cubelet;
        this.color = color;
        this.transform = transform;

        this.draw = function() {
            var mvMatrix = mat4.create();
            mat4.copy(mvMatrix, modelViewMatrix)
            this.transform();
            setMatrixUniforms();

            gl.uniform4fv(shaderProgram.ambient,  this.color);
            gl.uniform4fv(shaderProgram.diffuse,  cubelet.model.stickerModels[stickerIdx].diffuse);
            gl.uniform4fv(shaderProgram.specular, cubelet.model.stickerModels[stickerIdx].specular);
            gl.uniform1f(shaderProgram.shininess, cubelet.model.stickerModels[stickerIdx].shininess);
            // vertices
            gl.bindBuffer(gl.ARRAY_BUFFER, cubelet.stickerVerticesBuffers[stickerIdx]);
            gl.vertexAttribPointer(shaderProgram.vertexPosition, 3, gl.FLOAT, false, 0, 0);
            // normals
            gl.bindBuffer(gl.ARRAY_BUFFER, cubelet.stickerNormalsBuffers[stickerIdx]);
            gl.vertexAttribPointer(shaderProgram.vertexNormal, 3, gl.FLOAT, false, 0, 0);
            // faces
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubelet.stickerFacesBuffers[stickerIdx]);
            gl.drawElements(gl.TRIANGLES, cubelet.model.stickerModels[stickerIdx].faces.length, gl.UNSIGNED_SHORT, 0);

            mat4.copy(modelViewMatrix, mvMatrix);
        }
    }

    function NormalsCube(i,j,k) {
        this.normalsFramebuffer = null;
        this.normalsTexture = null;
        this.normalsRenderbuffer = null;
        this.verticesBuffer = null;
        this.normalsBuffer = null;
        this.facesBuffer = null;
        this.COLORS = {
            'blue': [0.0, 0.0, 1.0, 1.0],
            'green': [0.0, 1.0, 0.0, 1.0],
            'orange': [1.0, 0.5, 0.0, 1.0],
            'red': [1.0, 0.0, 0.0, 1.0],
            'black': [0.0, 0.0, 0.0, 1.0],
            'yellow': [1.0, 1.0, 0.0, 1.0]
        }
        this.NORMALS = {
            'blue':   [-1, 0,  0],
            'green':  [0,  0, -1],
            'orange': [1,  0,  0],
            'red':    [0,  0,  1],
            'black':  [0, -1,  0],
            'yellow': [0,  1,  0]
        }

        this.init = function() {
            this.initTextureFramebuffer();
            this.initBuffers();
        }

        this.initTextureFramebuffer = function() {
            this.normalsFramebuffer = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.normalsFramebuffer);

            this.normalsTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.normalsTexture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

            this.normalsRenderBuffer = gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, this.normalsRenderBuffer);
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, canvas.width, canvas.height);

            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.normalsTexture, 0);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.normalsRenderBuffer);

            gl.bindTexture(gl.TEXTURE_2D, null);
            gl.bindRenderbuffer(gl.RENDERBUFFER, null);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }

        this.initBuffers = function() {
            // vertices
            this.verticesBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.verticesBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalsCubeModel.vertices), gl.STATIC_DRAW);
            // normals
            this.normalsBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.normalsBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalsCubeModel.normals), gl.STATIC_DRAW);
            // faces
            this.facesBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.facesBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(normalsCubeModel.faces), gl.STATIC_DRAW);
        }

        this.init();

        this.draw = function() {
            var mvMatrix = mat4.create();
            mat4.copy(mvMatrix, modelViewMatrix);
            mat4.scale(modelViewMatrix, modelViewMatrix, [3, 3, 3]);
            setMatrixUniforms();

            gl.uniform1i(shaderProgram.lighting, 0);
            // vertices
            gl.bindBuffer(gl.ARRAY_BUFFER, this.verticesBuffer);
            gl.vertexAttribPointer(shaderProgram.vertexPosition, 3, gl.FLOAT, false, 0, 0);
            // normals
            gl.bindBuffer(gl.ARRAY_BUFFER, this.normalsBuffer);
            gl.vertexAttribPointer(shaderProgram.vertexNormal, 3, gl.FLOAT, false, 0, 0);
            // faces
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.facesBuffer);
            var offset = 0;
            for (var c in this.COLORS) {
                var color = this.COLORS[c];
                gl.uniform4fv(shaderProgram.ambient, this.COLORS[c]);
                gl.drawElements(gl.TRIANGLES, 3, gl.UNSIGNED_SHORT, offset);
                gl.drawElements(gl.TRIANGLES, 3, gl.UNSIGNED_SHORT, offset + normalsCubeModel.faces.length)
                offset += 6;
            }

            mat4.copy(modelViewMatrix, mvMatrix);
            gl.uniform1i(shaderProgram.lighting, 1);
        }

        this.selectorColorToNormal = function(rgba) {
            var r = (rgba[0] / 255).toFixed(1);
            var g = (rgba[1] / 255).toFixed(1);
            var b = (rgba[2] / 255).toFixed(1);
            for (var c in this.COLORS) {
                var color = this.COLORS[c];
                if (r == color[0] && g == color[1] && b == color[2]) {
                    return this.NORMALS[c];
                }
            }
            return null;
        }

        this.getNormal = function(x, y) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.normalsFramebuffer);
            var pixelValues = new Uint8Array(4);
            gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelValues);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            return this.selectorColorToNormal(pixelValues);
        }
    }

    function initWebGL(canvas) {
        if (!window.WebGLRenderingContext) {
            console.log("Your browser doesn't support WebGL.")
                return null;
        }
        gl = canvas.getContext('webgl',
              {preserveDrawingBuffer: true, antialias:true}) ||
             canvas.getContext('experimental-webgl',
              {preserveDrawingBuffer: true, antialias:true});
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        if (!gl) {
            console.log("Your browser supports WebGL, but initialization failed.");
            return null;
        }
        return gl;
    }

    function getShader(gl, id) {
        var shaderScript = document.getElementById(id);
        if (!shaderScript) {
            return null;
        }
        var source = '';
        var currentChild = shaderScript.firstChild;
        while (currentChild) {
            if (currentChild.nodeType == currentChild.TEXT_NODE) {
                source += currentChild.textContent;
            }
            currentChild = currentChild.nextSibling;
        }
        var shader;
        if (shaderScript.type == 'x-shader/x-fragment') {
            shader = gl.createShader(gl.FRAGMENT_SHADER);
        } else if (shaderScript.type == 'x-shader/x-vertex') {
            shader = gl.createShader(gl.VERTEX_SHADER);
        } else {
            return null;
        }
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.log('An error occurred while compiling the shader: ' + gl.getShaderInfoLog(shader));
            return null;
        }
        return shader;
    }

    function initShaders() {
        var fragmentShader = getShader(gl, 'fragmentShader');
        var vertexShader = getShader(gl, 'vertexShader');
        shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, fragmentShader);
        gl.attachShader(shaderProgram, vertexShader);
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.log('Unable to initialize the shader program');
        }
        gl.useProgram(shaderProgram);
        shaderProgram.vertexPosition = gl.getAttribLocation(shaderProgram, 'vertexPosition');
        gl.enableVertexAttribArray(shaderProgram.vertexPosition);
        shaderProgram.vertexNormal = gl.getAttribLocation(shaderProgram, 'vertexNormal');
        gl.enableVertexAttribArray(shaderProgram.vertexNormal);
        shaderProgram.eyePosition = gl.getUniformLocation(shaderProgram, 'eyePosition');
        gl.uniform3fv(shaderProgram.eyePosition, eye);
        shaderProgram.lighting = gl.getUniformLocation(shaderProgram, 'lighting');
        shaderProgram.ambient = gl.getUniformLocation(shaderProgram, 'ambient');
        shaderProgram.diffuse = gl.getUniformLocation(shaderProgram, 'diffuse');
        shaderProgram.specular = gl.getUniformLocation(shaderProgram, 'specular');
        shaderProgram.shininess = gl.getUniformLocation(shaderProgram, 'shininess');
    }

    function drawScene() {
        if (isRotating) {
            rubiksCube.rotateLayer(rubiksCube.currentMove.count > 1);
        }

        rubiksCube.drawToNormalsFramebuffer();
        rubiksCube.drawToPickingFramebuffer();
        if (!isInitializing) {
            rubiksCube.draw();
        }
    }

    function tick() {
        requestAnimationFrame(tick);
        drawScene();
    }

    function start(el) {
        var cubeSortStr, cubeSort;
        canvas = el;
        CANVAS_X_OFFSET = $(canvas).offset()['left'];
        CANVAS_Y_OFFSET = $(canvas).offset()['top'];
        cubeSortStr = $(canvas).data('sort') || 'Rubiks' ;
        gl = initWebGL(canvas);
        initShaders();
        cubeSort = cubeSortStr.toLowerCase() == 'mirrorblocks' ?
                           CUBE_SORTS.MirrorBlocks : CUBE_SORTS.Rubiks;
        rubiksCube = new RubiksCube(this, cubeSort);
        this.rubiksCube = rubiksCube;
        perspectiveView();

        if (gl) {
            gl.clearColor(1.0, 1.0, 1.0, 1.0);
            gl.enable(gl.DEPTH_TEST);
            gl.depthFunc(gl.LEQUAL);
            gl.enable(gl.CULL_FACE);
            gl.cullFace(gl.BACK);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            tick();
        }
        // by default every GLube gets its own publisher
        subscribeTo(new Publisher());
    }

    function setMatrixUniforms() {
        var projectionUniform = gl.getUniformLocation(shaderProgram, 'projectionMatrix');
        gl.uniformMatrix4fv(projectionUniform, false, projectionMatrix);
        var modelViewUniform = gl.getUniformLocation(shaderProgram, 'modelViewMatrix');
        gl.uniformMatrix4fv(modelViewUniform, false, modelViewMatrix);
        var _normalMatrix = mat4.create();
        mat4.invert(_normalMatrix, modelViewMatrix);
        mat4.transpose(_normalMatrix, _normalMatrix);
        var normalMatrix = mat3.create();
        mat3.fromMat4(normalMatrix, _normalMatrix);
        var normalMatrixUniform = gl.getUniformLocation(shaderProgram, 'normalMatrix');
        gl.uniformMatrix3fv(normalMatrixUniform, false, normalMatrix);
    }

    function unproject(dest, vec, view, proj, viewport) {
        var m = mat4.create();
        var v = vec4.create();

        v[0] = (vec[0] - viewport[0]) * 2.0 / viewport[2] - 1.0;
        v[1] = (vec[1] - viewport[1]) * 2.0 / viewport[3] - 1.0;
        v[2] = 2.0 * vec[2] - 1.0;
        v[3] = 1.0;

        mat4.multiply(m, proj, view);
        mat4.invert(m, m);

        vec4.transformMat4(v, v, m);
        if (v[3] == 0.0) {
            return null;
        }

        dest[0] = v[0] / v[3];
        dest[1] = v[1] / v[3];
        dest[2] = v[2] / v[3];

        return dest;
    }

    function screenToObjectCoordinates(x, y) {
        var objectCoordinates = vec3.create();
        var screenCoordinates = [x, y, 0];
        unproject(objectCoordinates, screenCoordinates, modelViewMatrix, projectionMatrix, [0, 0, canvas.width, canvas.height])
        return objectCoordinates;
    }

    function degreesToRadians(degrees) {
        return degrees * Math.PI / 180;
    }

    function setCtrlPressed(v) {
      ctrlPressed = v;
    }
    function keydown(event) {
      if (event.keyCode == 17 ) {
        setCtrlPressed(true);
      }
    }

    function keyup(event) {
      if (event.keyCode == 17) {
        setCtrlPressed(false);
      }
    }

    // FIXME: Need better name
    function rotateCube(axis, degrees) {
      var newRotationMatrix = mat4.create();
      mat4.rotate(newRotationMatrix, newRotationMatrix, degreesToRadians(degrees), axis);
      mat4.multiply(rotationMatrix, newRotationMatrix, rotationMatrix);

    }

    function rotate(event) {
        if (rightMouseDown) {
            x_init_right = event.clientX;
            y_init_right = event.clientY;
            var delta_x = parseInt((x_new_right - x_init_right) * 360 / this.width);
            var delta_y = parseInt((y_new_right - y_init_right) * 360 / this.width);

            var axis = [-delta_y, delta_x, 0];
            var degrees = Math.sqrt(delta_x * delta_x + delta_y * delta_y);

            publisher.publishRotateCube(axis, degrees);

        } else if (leftMouseDown && !isRotating) {
            var rotation;
            new_coordinates = screenToObjectCoordinates(event.pageX - CANVAS_X_OFFSET, canvas.height - event.pageY + CANVAS_Y_OFFSET);
            var direction = vec3.create();
            vec3.subtract(direction, new_coordinates, init_coordinates);
            vec3.normalize(direction, direction);
            rotation = rubiksCube.getRotation(event.pageX - CANVAS_X_OFFSET, canvas.height - event.pageY + CANVAS_Y_OFFSET, direction);
            publisher.publishTurn(rotation);
        }
        x_new_right = event.clientX;
        y_new_right = event.clientY;
    }

    function startRotate(event) {
        if (event.button == LEFT_MOUSE && !ctrlPressed) { // left mouse
            var cubeletIndex;
            rubiksCube.selectedCubeletIndices = [];
            cubeletIndex = rubiksCube.getSelectedCubeletIndex(event.pageX - CANVAS_X_OFFSET, canvas.height - event.pageY + CANVAS_Y_OFFSET);
            publisher.setSelectedCubeletIndices([cubeletIndex]);

            if (cubeletIndex != undefined) {
                init_coordinates = screenToObjectCoordinates(event.pageX - CANVAS_X_OFFSET, canvas.height - event.pageY + CANVAS_Y_OFFSET);
                setTimeout(function() {
                    leftMouseDown = true;
                }, 50);
            }
        } else if (event.button == RIGHT_MOUSE ||
                   (event.button == LEFT_MOUSE && ctrlPressed)) { // right mouse
            rightMouseDown = true;
            x_init_right = event.pageX;
            y_init_right = event.pageY;
        }
    }

    function endRotate(event) {
        if (event.button == LEFT_MOUSE && !ctrlPressed &&
            leftMouseDown) { // left mouse
            leftMouseDown = false;

            // FIXME: Do we need an algDone()?

        } else if (event.button == RIGHT_MOUSE ||
                  (event.button == LEFT_MOUSE && ctrlPressed)) { // right mouse
            rightMouseDown = false;
        }
    }

    function topView() {
        mat4.identity(rotationMatrix);
        mat4.rotateX(rotationMatrix, rotationMatrix, degreesToRadians(90));
    }

    function bottomView() {
        mat4.identity(rotationMatrix);
        mat4.rotateX(rotationMatrix, rotationMatrix, degreesToRadians(-90));
    }

    function leftView() {
        mat4.identity(rotationMatrix);
        mat4.rotateY(rotationMatrix, rotationMatrix, degreesToRadians(-90));
    }

    function rightView() {
        mat4.identity(rotationMatrix);
        mat4.rotateY(rotationMatrix, rotationMatrix, degreesToRadians(90));
    }

    function frontView() {
        mat4.identity(rotationMatrix);
    }

    function backView() {
        mat4.identity(rotationMatrix);
        mat4.rotateY(rotationMatrix, rotationMatrix, degreesToRadians(180));
    }

    function perspectiveView() {
        mat4.identity(rotationMatrix);
        mat4.rotateX(rotationMatrix, rotationMatrix, degreesToRadians(30));
        mat4.rotateY(rotationMatrix, rotationMatrix, degreesToRadians(-50));
        mat4.rotateZ(rotationMatrix, rotationMatrix, degreesToRadians(0));
    }

    function togglePerspective(event) {
        switch(event.which) {
            case 32: // space
                perspectiveView();
                break;
            case 97: // a, left
                leftView();
                break;
            case 100: // d, right
                rightView();
                break;
            case 101: // e, top
                topView();
                break;
            case 113: // q, bottom
                bottomView();
                break;
            case 115: // s, back
                backView();
                break;
            case 119: // w, front
                frontView();
                break;
        }
    }

    function testLayerMoves() {
        if (!isAnimating) {
            isAnimating = true;
            rubiksCube.perform([
                {face:"R", inverse:false},
                {face:"R", inverse:true},
                {face:"L", inverse:false},
                {face:"L", inverse:true},
                {face:"U", inverse:false},
                {face:"U", inverse:true},
                {face:"D", inverse:false},
                {face:"D", inverse:true},
                {face:"F", inverse:false},
                {face:"F", inverse:true},
                {face:"B", inverse:false},
                {face:"B", inverse:true},
                {face:"M", inverse:false},
                {face:"M", inverse:true},
                {face:"E", inverse:false},
                {face:"E", inverse:true},
                {face:"S", inverse:false},
                {face:"S", inverse:true}
                ]);
            return;
        }
    }

        function scramble() {
        var count;
        isInitializing = false;
        if (!isAnimating) {
            if ($(canvas).parent().find('.scramble-length')) {
               count = parseInt($(canvas).parent().find('.scramble-length').val());
            } else {
                count = Math.floor(Math.random() * 10) + 10;
            }
            var moves = ['R','L','U','D','F','B'];
            var movesWithSlices = ['R','L','U','D','F','B','M','E','S'];
            var moveList = [];
            var moveIndex = 0;
            var prevIndex = 0;
            var randomMove;
            var inverse = false;
            var moveCount = 1;
            for (var i = 0; i < count; i++) {
                moveIndex = Math.floor(Math.random() * moves.length);
                while (moveIndex/2 == prevIndex/2) {
                    moveIndex = Math.floor(Math.random() * moves.length);
                }
                randomMove = moves[moveIndex];
                prevIndex = moveIndex;
                moveCount = 1 + Math.floor(Math.random()*2);
                inverse = moveCount==1 && Math.random() < 0.5;
                moveList.push({face:randomMove, inverse:inverse, count:moveCount});
            }
            publishAlgorithm(moveList);
            var ret = rubiksCube.moveListToString(moveList);
            $(canvas).parent().find('.algorithm').val(ret);
        }
        return ret;
    }

    function parseAlgorithm(algorithm) {
        var alg = algorithm;
        alg = alg.replace(/ /g, '');
            alg = alg.replace(/'/g,'3');
        alg = alg.replace(/-/g,'3');
        alg = alg.replace(/([^LRUDFBMESxyz0123456789])/gi,"");
            // add count where necessary
        alg = alg.replace(/([LRUDFBMESxyz])([^0-9])/ig,"$11$2");
        alg = alg.replace(/([LRUDFBMESxyz])([^0-9])/ig,"$11$2");
        alg = alg.replace(/([0-9])([LRUDFBMESxyz])/ig,"$1,$2");
        alg = alg.replace(/([LRUDFBMESxyz])$/i,"$11");

            var moveList = alg.split(",")
                .map(function(el){
                  var n = 1*el.charAt(1);
                  return {
                      face:el.charAt(0),
                      inverse: n==3,
                      count:(""+n).replace(3,1)}
                });

        return moveList;
    }

    function doAlgorithm(moves) {
      if (!isAnimating) {
        isAnimating = true;
        rubiksCube.perform(moves);
      }
    }

    function initControls() {
        $('#controls .btn').click(function() {
            var arrControls = [
                "R","L","U","D","F","B",
                "R-prime","L-prime","U-prime","D-prime","F-prime","B-prime",
                "R2","L2","U2","D2","F2","B2"
                ];
            var control = this.id.replace('move-','');
            var prime = false;
            var doubleMove = false;
            if (control.match('prime'))
                prime = true;
            if (control.match('2'))
                doubleMove = true;
            var layer = control.charAt(0);
            var moveList = [];
            moveList.push({face:layer, inverse:prime, count:doubleMove?2:1});
            rubiksCube.perform(moveList);
        });
    }

    function publishAlgorithm(moves) {
      publisher.publishAlgorithm(moves);
    }

    function publishReset() {
      publisher.publishReset();
    }

    /*
     *  If one subscribes to a publisher then this GLube object is
     */
    function subscribeTo(p) {
      publisher = p;
      p.addGlube(that);
    }

    // public interface
    this.start = start;
    this.reset = function() { if (!isAnimating) { rubiksCube.reset(); }} ;
    this.rubiksCube = null;
    this.initControls = function() { initControls(); };
    this.parseAlgorithm = parseAlgorithm;
    this.doAlgorithm = doAlgorithm;
    this.scramble = scramble;
    this.rotate = rotate;
    this.startRotate = startRotate;
    this.keyup = keyup;
    this.keydown = keydown;
    this.endRotate = endRotate;
    this.togglePerspective = togglePerspective;
    this.setIsRotating = setIsRotating;
    this.turn = turn;
    this.subscribeTo = subscribeTo;
    this.rotateCube = rotateCube;
    this.publishAlgorithm = publishAlgorithm;
    this.publishReset = publishReset;


  }; // var GLube = function() {

  /*
   *  So that multiple GLubes can be made to "turn in sync" with each
   *  other each GLube publishes moves to a publish, which in turn
   *  use the GLube's API to actually perform the moves.
   *
   *  By default each GLube has its own publisher but it can be overriden
   *  with the subscribeTo function.
   */
  var Publisher = function() {

    this.glubes = [];
    this.selectedCubeletIndices = null;


    this.addGlube = function(glube) {
      this.glubes.push(glube);
    };

    this.setSelectedCubeletIndices = function(cubeletIndices) {
      this.selectedCubeletIndices = cubeletIndices;
    };

    this.publishTurn = function(rotation) {
      var i;
      for (i in this.glubes) {
        this.glubes[i].turn(this.selectedCubeletIndices, rotation);
      }
    };

    this.publishRotateCube = function(axis, degrees) {
      var i;
      for (i in this.glubes) {
        this.glubes[i].rotateCube(axis, degrees);
      }
    };

    this.publishAlgorithm = function(moves) {
      var i;
      for (i in this.glubes) {
        this.glubes[i].doAlgorithm(moves);
      }
    }

    this.publishReset = function() {
      var i;
      for (i in this.glubes) {
        this.glubes[i].reset();
      }
    }

  };

  // global scope
  $(document).ready(function() {
      var publishers = {};

      $('.glube').each(function() {
        var glube = new GLube;
        var canvas = $(this).find('canvas')[0];

        glube.start(canvas);
        $(canvas).bind('contextmenu', function(e) { return false; });

        $(document).keydown(glube.keydown);
        $(document).keyup(glube.keyup);
        $(canvas).mousedown(glube.startRotate);
        $(canvas).mousemove(glube.rotate);
        $(canvas).mouseup(glube.endRotate);

        glube.reset();
        glube.initControls();


        $(this).find('.reset-cube').click(function() {glube.publishReset();});
        $(this).find('.scramble-cube').click(function() {glube.scramble()});
        $(this).find('.run-alg').click(function() {
            glube.isInitializing = false;
            var alg = $(this).prev().find('.algorithm').val();
            var moves = glube.parseAlgorithm(alg);
            glube.publishAlgorithm(moves);
        });

        var sync_id = $(canvas).data("sync-id")
        if (sync_id != undefined) {
          if (!publishers[sync_id]) {
            publishers[sync_id] = new Publisher();
          }
          glube.subscribeTo(publishers[sync_id])
        }
      });

  });

})();