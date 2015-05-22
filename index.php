<?php
$alg = filter_input(INPUT_GET,'alg',FILTER_SANITIZE_STRING);
$algType = filter_input(INPUT_GET,'type',FILTER_SANITIZE_STRING);
if ($algType!='generator' && $algType!='solver') {
    $algType = 'solver';
}
$stickers = filter_input(INPUT_GET,'stickers', FILTER_SANITIZE_STRING);
?>
<!DOCTYPE html>
<html class="no-js">
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>GLube - Rubik's Cube</title>
        <meta name="description" content="">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" href="http://netdna.bootstrapcdn.com/bootstrap/3.1.1/css/bootstrap.min.css">
        <link rel="stylesheet" href="static/main.css">
        <script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js"></script>
        <script src="js/jquery.easing.min.js"></script>
        <script src="http://netdna.bootstrapcdn.com/bootstrap/3.1.1/js/bootstrap.min.js"></script>
        <script type="text/javascript" src="js/gl-matrix-min.js"></script>
        <script type="text/javascript" src="js/models.js"></script>
        <script type="text/javascript" src="js/rubiks.js"></script>
        <script id="fragmentShader" type="x-shader/x-fragment">
            varying highp vec4 position;
            varying highp vec3 normal;

            uniform bool lighting;
            uniform highp vec3 eyePosition;
            uniform highp vec4 ambient;
            uniform highp vec4 diffuse;
            uniform highp vec4 specular;
            uniform highp float shininess;

            const highp vec4 lightPosition = vec4(-1.,1.,-1., 1);
            const highp vec4 lightColor = vec4(.2,.2,.2,1);

            void main(void) {
                if (lighting) {
                    highp vec3 position = position.xyz / position.w;
                    highp vec3 eyeDirection = normalize(eyePosition - position);
                    highp vec3 lightPosition = lightPosition.xyz / lightPosition.w;
                    highp vec3 lightDirection = normalize(lightPosition - position);
                    highp vec3 halfAngle = normalize(lightDirection + eyeDirection);
                    highp vec4 diffuseTerm = diffuse * lightColor * max(dot(normal, lightDirection), 0.0);
                    highp vec4 specularTerm = specular * lightColor * pow(max(dot(normal, halfAngle), 0.0), shininess);
                    gl_FragColor = diffuseTerm + specularTerm + ambient;
                } else {
                    gl_FragColor = ambient;
                }
            }
        </script>
        <script id="vertexShader" type="x-shader/x-vertex">
            attribute vec3 vertexPosition;
            attribute vec3 vertexNormal;

            uniform mat4 modelViewMatrix;
            uniform mat4 projectionMatrix;
            uniform mat3 normalMatrix;

            varying vec4 position;
            varying vec3 normal;

            void main(void) {
                position = modelViewMatrix * vec4(vertexPosition, 1.0);
                gl_Position = projectionMatrix * position;
                normal = normalize(normalMatrix * vertexNormal);
            }
       </script>
    </head>
    <body class="container">
        <div class="row fill">
            <div class="col-md-5 fill">
                <h3>GLube - Rubik's Cube</h3>
                <h5 class="text-muted">GLube - A Rubik's Cube with WebGL</h5>
                <a href="https://github.com/blonkm/rubiks-cube"><img src="static/GitHub-Mark-64px.png" alt="github logo"></a>
                <div class="controls">
                    <div>Click and drag with <span class="control">left mouse</span> to rotate a layer</div>
                    <div>Click and drag with <span class="control">right mouse</span> to rotate the Rubik's Cube</div>
                    <div><span class="control">Space</span> for perspective view</div>
                    <div><strong>Parameters (in url, e.g. ?type=solver):</strong></div>
                    <div><span class="control">stickers</span> CROSS, FL, F2L, PLL, OLL, FL</div>
                    <div><span class="control">alg</span> initial algorithm to perform</div>
                    <div><span class="control">type</span> generator, or solver</div>
                </div>
                <form>
	                <div>
	                <button id="reset-cube" type="button" class="btn btn-primary btn-lg">Reset</button>
	                <button id="scramble-cube" type="button" class="btn btn-primary btn-lg">Scramble</button>
                            <label for="scramble-length">Length</label> <input type="number" id="scramble-length" min="1" value="20" />
                            <div id="moveList" class="well" style="margin-top:1em">moves will appear here</div>
			</div>
	                <p>
	                <button id="run-alg" type="button" class="btn btn-primary btn-lg">Run algorithm</button><br/>
                            <label for="algorithm">Algorithm</label> <input  class="form-control" placeholder="Algorithm" type="text" id="algorithm" />
                	</p>
                </form>
				<table id="controls">
					<tr>
						<td><button class="btn" id="move-R">R</button></td>
						<td><button class="btn" id="move-L">L</button></td>
						<td><button class="btn" id="move-U">U</button></td>
						<td><button class="btn" id="move-D">D</button></td>
						<td><button class="btn" id="move-F">F</button></td>
						<td><button class="btn" id="move-B">B</button></td>
						<td><button class="btn" id="move-M">M</button></td>
						<td><button class="btn" id="move-E">E</button></td>
						<td><button class="btn" id="move-S">S</button></td>
					</tr>
					<tr>
						<td><button class="btn" id="move-R-prime">R'</button></td>
						<td><button class="btn" id="move-L-prime">L'</button></td>
						<td><button class="btn" id="move-U-prime">U'</button></td>
						<td><button class="btn" id="move-D-prime">D'</button></td>
						<td><button class="btn" id="move-F-prime">F'</button></td>
						<td><button class="btn" id="move-B-prime">B'</button></td>
						<td><button class="btn" id="move-M-prime">M'</button></td>
						<td><button class="btn" id="move-E-prime">E'</button></td>
						<td><button class="btn" id="move-S-prime">S'</button></td>
					</tr>
					<tr>
						<td><button class="btn" id="move-R2">R2</button></td>
						<td><button class="btn" id="move-L2">L2</button></td>
						<td><button class="btn" id="move-U2">U2</button></td>
						<td><button class="btn" id="move-D2">D2</button></td>
						<td><button class="btn" id="move-F2">F2</button></td>
						<td><button class="btn" id="move-B2">B2</button></td>
						<td><button class="btn" id="move-M2">M2</button></td>
						<td><button class="btn" id="move-E2">E2</button></td>
						<td><button class="btn" id="move-S2">S2</button></td>
					</tr>
				</table>
            </div>
            <div class="col-md-7 fill" style="width:400px; height:400px;">
                <canvas id="glcanvas" width="400" height="400" data-alg="<?php echo $alg?>" data-type="<?php echo $algType?>" data-stickers="<?php echo $stickers?>"></canvas>
            </div>
        </div>
    </body>
</html>