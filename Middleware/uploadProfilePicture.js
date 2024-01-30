 const multer = require('multer')

 const storage = multer.diskStorage({
    destination: 'upload',
    filename: (req, file, cb) => {
        cb(null, file.originalname)
    }
 })

 const upload = multer({ storage: storage}).single('testImage')

 module.exports = upload