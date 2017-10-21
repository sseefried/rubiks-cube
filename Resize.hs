module Resize where

type Coord = (Double, Double, Double)

data Model =
  Model {
    block   :: [Coord]
  , sticker :: [Coord]
  , lengths ::  Coord
  } deriving (Read, Show, Eq)

model :: Model
model =
  Model {
    block   = mkCoords [ -0.844631, -1.0, 0.844631, -0.844631, -0.844631, 1.0, -1.0, -0.844631, 0.844631, -0.844631, -0.988173, 0.904088, -0.844631, -0.954494, 0.954494, -0.904088, -0.988173, 0.844631, -0.905578, -0.9739, 0.905578, -0.902486, -0.946593, 0.946593, -0.934333, -0.934333, 0.934333, -0.904088, -0.844631, 0.988173, -0.954494, -0.844631, 0.954494, -0.844631, -0.904088, 0.988173, -0.905578, -0.905578, 0.9739, -0.946593, -0.902486, 0.946593, -0.988173, -0.904088, 0.844631, -0.954494, -0.954494, 0.844631, -0.988173, -0.844631, 0.904088, -0.9739, -0.905578, 0.905578, -0.946593, -0.946593, 0.902486, -1.0, -0.844631, -0.844631, -0.844631, -0.844631, -1.0, -0.844631, -1.0, -0.844631, -0.988173, -0.844631, -0.904088, -0.954494, -0.844631, -0.954494, -0.988173, -0.904088, -0.844631, -0.9739, -0.905578, -0.905578, -0.946593, -0.902486, -0.946593, -0.934333, -0.934333, -0.934333, -0.844631, -0.904088, -0.988173, -0.844631, -0.954494, -0.954494, -0.904088, -0.844631, -0.988173, -0.905578, -0.905578, -0.9739, -0.902486, -0.946593, -0.946593, -0.904088, -0.988173, -0.844631, -0.954494, -0.954494, -0.844631, -0.844631, -0.988173, -0.904088, -0.905578, -0.9739, -0.905578, -0.946593, -0.946593, -0.902486, 0.844631, -0.844631, -1.0, 1.0, -0.844631, -0.844631, 0.844631, -1.0, -0.844631, 0.904088, -0.844631, -0.988173, 0.954494, -0.844631, -0.954494, 0.844631, -0.904088, -0.988173, 0.905578, -0.905578, -0.9739, 0.946593, -0.902486, -0.946593, 0.934333, -0.934333, -0.934333, 0.988173, -0.904088, -0.844631, 0.954494, -0.954494, -0.844631, 0.988173, -0.844631, -0.904088, 0.9739, -0.905578, -0.905578, 0.946593, -0.946593, -0.902486, 0.844631, -0.988173, -0.904088, 0.844631, -0.954494, -0.954494, 0.904088, -0.988173, -0.844631, 0.905578, -0.9739, -0.905578, 0.902486, -0.946593, -0.946593, 1.0, -0.844631, 0.844631, 0.844631, -0.844631, 1.0, 0.844631, -1.0, 0.844631, 0.988173, -0.844631, 0.904088, 0.954494, -0.844631, 0.954494, 0.988173, -0.904088, 0.844631, 0.9739, -0.905578, 0.905578, 0.946593, -0.902486, 0.946593, 0.934333, -0.934333, 0.934333, 0.844631, -0.904088, 0.988173, 0.844631, -0.954494, 0.954494, 0.904088, -0.844631, 0.988173, 0.905578, -0.905578, 0.9739, 0.902486, -0.946593, 0.946593, 0.904088, -0.988173, 0.844631, 0.954494, -0.954494, 0.844631, 0.844631, -0.988173, 0.904088, 0.905578, -0.9739, 0.905578, 0.946593, -0.946593, 0.902486, -1.0, 0.844631, 0.844631, -0.844631, 0.844631, 1.0, -0.844631, 1.0, 0.844631, -0.988173, 0.844631, 0.904088, -0.954494, 0.844631, 0.954494, -0.988173, 0.904088, 0.844631, -0.9739, 0.905578, 0.905578, -0.946593, 0.902486, 0.946593, -0.934333, 0.934333, 0.934333, -0.844631, 0.904088, 0.988173, -0.844631, 0.954494, 0.954494, -0.904088, 0.844631, 0.988173, -0.905578, 0.905578, 0.9739, -0.902486, 0.946593, 0.946593, -0.904088, 0.988173, 0.844631, -0.954494, 0.954494, 0.844631, -0.844631, 0.988173, 0.904088, -0.905578, 0.9739, 0.905578, -0.946593, 0.946593, 0.902486, -1.0, 0.844631, -0.844631, -0.844631, 1.0, -0.844631, -0.844631, 0.844631, -1.0, -0.988173, 0.904088, -0.844631, -0.954494, 0.954494, -0.844631, -0.988173, 0.844631, -0.904088, -0.9739, 0.905578, -0.905578, -0.946593, 0.946593, -0.902486, -0.934333, 0.934333, -0.934333, -0.844631, 0.988173, -0.904088, -0.844631, 0.954494, -0.954494, -0.904088, 0.988173, -0.844631, -0.905578, 0.9739, -0.905578, -0.902486, 0.946593, -0.946593, -0.904088, 0.844631, -0.988173, -0.954494, 0.844631, -0.954494, -0.844631, 0.904088, -0.988173, -0.905578, 0.905578, -0.9739, -0.946593, 0.902486, -0.946593, 0.844631, 0.844631, -1.0, 0.844631, 1.0, -0.844631, 1.0, 0.844631, -0.844631, 0.844631, 0.904088, -0.988173, 0.844631, 0.954494, -0.954494, 0.904088, 0.844631, -0.988173, 0.905578, 0.905578, -0.9739, 0.902486, 0.946593, -0.946593, 0.934333, 0.934333, -0.934333, 0.904088, 0.988173, -0.844631, 0.954494, 0.954494, -0.844631, 0.844631, 0.988173, -0.904088, 0.905578, 0.9739, -0.905578, 0.946593, 0.946593, -0.902486, 0.988173, 0.844631, -0.904088, 0.954494, 0.844631, -0.954494, 0.988173, 0.904088, -0.844631, 0.9739, 0.905578, -0.905578, 0.946593, 0.902486, -0.946593, 1.0, 0.844631, 0.844631, 0.844631, 1.0, 0.844631, 0.844631, 0.844631, 1.0, 0.988173, 0.904088, 0.844631, 0.954494, 0.954494, 0.844631, 0.988173, 0.844631, 0.904088, 0.9739, 0.905578, 0.905578, 0.946593, 0.946593, 0.902486, 0.934333, 0.934333, 0.934333, 0.844631, 0.988173, 0.904088, 0.844631, 0.954494, 0.954494, 0.904088, 0.988173, 0.844631, 0.905578, 0.9739, 0.905578, 0.902486, 0.946593, 0.946593, 0.904088, 0.844631, 0.988173, 0.954494, 0.844631, 0.954494, 0.844631, 0.904088, 0.988173, 0.905578, 0.905578, 0.9739, 0.946593, 0.902486, 0.946593]
  , sticker = mkCoords [ -0.7225, 0.0, 0.85, -0.85, 0.0, -0.7225, 0.7225, 0.0, -0.85, 0.85, 0.0, 0.7225, -0.840295, 0.0, -0.771292, -0.812656, 0.0, -0.812656, -0.771292, 0.0, -0.840295, -0.7225, 0.0, -0.85, 0.771292, 0.0, -0.840295, 0.812656, 0.0, -0.812656, 0.840295, 0.0, -0.771292, 0.85, 0.0, -0.7225, -0.771292, 0.0, 0.840295, -0.812656, 0.0, 0.812656, -0.840295, 0.0, 0.771292, -0.85, 0.0, 0.7225, 0.840295, 0.0, 0.771292, 0.812656, 0.0, 0.812656, 0.771292, 0.0, 0.840295, 0.7225, 0.0, 0.85]
  , lengths = (1,1,1) -- lengths are scaled to 1
  }

mkCoords :: [a] -> [(a,a,a)]
mkCoords []            = []
mkCoords (x:[])        = error "mkCoords: length not divisible by 3"
mkCoords (x1:x2:[])    = error "mkCoords: length not divisible by 3"
mkCoords (x1:x2:x3:xs) = (x1,x2,x3):mkCoords xs

{-

I want the resulting cube to be the same overall length as the original cube i.e. 6x6x6 units
but I want the proportions to be quite different.

On the x axis I want the ratio to be ...

-}

extendX :: Double -> Coord -> Coord
extendX f (x,y,z) = (f*x, y, z)

extendY :: Double -> Coord -> Coord
extendY f (x,y,z) = (x, f*y, z)

extendZ :: Double -> Coord -> Coord
extendZ f (x,y,z) = (x, y, f*z)

liftModel :: (Coord -> Coord) -> Model -> Model
liftModel f (Model block sticker lengths) =
  Model (map f block) (map f sticker) (f lengths)

flattenTriples :: [(a,a,a)] -> [a]
flattenTriples []              = []
flattenTriples ((x1,x2,x3):xs) = x1:x2:x3:flattenTriples xs

printModelAsJS :: Model -> IO ()
printModelAsJS (Model block sticker (xLen, yLen, zLen)) = do
  putStrLn $ unlines $
    [ "blockModel: " ++ show (flattenTriples block)
    , "stickerModel: " ++ show (flattenTriples sticker)
    , "xLen: " ++ show xLen
    , "yLen: " ++ show yLen
    , "zLen: " ++ show zLen
    ]

