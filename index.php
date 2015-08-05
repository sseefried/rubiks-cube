<?php
require_once ("./classes/Glube.php"); 

$g = new GlubeApp\Glube();
$g->cubes = $g->initialize();
?>
<!DOCTYPE html>
<html class="no-js">
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>GLube - Rubik's Cube</title>
        <meta name="description" content="A WebGL animated Rubik's cube by Michiel van der Blonk">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" href="http://maxcdn.bootstrapcdn.com/bootstrap/3.1.1/css/bootstrap.min.css">
        <link rel="stylesheet" href="static/main.css">
        <script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js"></script>
        <script data-src="shaders/vertex.js" data-name="cube" type="x-shader/x-vertex"></script>
        <script data-src="shaders/fragment.js" data-name="cube" type="x-shader/x-fragment"></script>
        <script type="text/javascript" src="js/ShaderLoader.js"></script>
        <script type="text/javascript" src="js/jquery.easing.min.js"></script>
        <script type="text/javascript" src="js/requestanimationframe-fix.js"></script>
        <script type="text/javascript" src="http://netdna.bootstrapcdn.com/bootstrap/3.1.1/js/bootstrap.min.js"></script>
        <script type="text/javascript" src="js/gl-matrix-min.js"></script>
        <script type="text/javascript" src="js/models.js"></script>
        <script type="text/javascript" src="js/rubiks.js"></script>
    </head>
    <body>
        <div class="container">
            <div class="row-fluid">
                <h3>GLube - Rubik's Cube</h3>
                <h5 class="text-muted">GLube - A Rubik's Cube with WebGL</h5>
                <a href="https://github.com/blonkm/rubiks-cube"><img src="static/GitHub-Mark-64px.png" alt="github logo"></a>
                <div class="help-block">
                    <div>Click and drag with <span class="control">left mouse</span> to rotate a layer</div>
                    <div>Click and drag with <span class="control">left mouse</span> outside cube to rotate the Rubik's Cube</div>
                    <div><strong>Parameters (in url, e.g. ?type=solver):</strong></div>
                    <div><span class="control">stickers</span> CROSS, FL, F2L, PLL, OLL, FULL</div>
                    <div><span class="control">alg</span> initial algorithm to perform</div>
                    <div><span class="control">initscript</span> invisible initial algorithm to perform</div>
                    <div><span class="control">type</span> generator, or solver</div>
                    <div><span class="control">&lt;param&gt;N</span> specific cube params, e.g. alg2=... for second cube</div>
                </div>
            </div>
            <div class="row">
<?php foreach ($g->cubes as $cube) {?>
                <div class="glube col-md-3">
                    <canvas 
                            data-alg="<?php echo $cube->alg ?>" 
                            data-type="<?php echo $cube->algType ?>" 
                            data-stickers="<?php echo $cube->stickers ?>"
                            data-initscript="<?php echo $cube->initscript ?>"
                            data-playable="<?php echo $cube->playable ?>"
                            ></canvas>
	                <div>
                        <button class="scramble-cube btn btn-info btn-sm"><span class="glyphicon glyphicon-random"></span></button>                         
                        <button class="reset-cube btn btn-info btn-sm"><span class="glyphicon glyphicon-fast-backward"></span></button>                         
                        <div class="scramble">
                            <label>Length</label> 
                            <input type="number" class="scramble-length" min="1" value="<?php echo $cube->scrambleLength ?: 20 ?>" />
                            <pre class="@brand-info moveList" style="margin-top:1em">moves will appear here</pre>
            </div>
                        <div class="alg">
                            <label>Algorithm</label> 
                            <input class="algorithm form-control" placeholder="Algorithm" type="text" />
                        </div>
                        <button class="run-alg btn btn-info btn-sm"><span class="glyphicon glyphicon-play"></span></button>                         
                    </div>
                </div>
<?}?>
            </div>
        </div>
    </body>
</html>
