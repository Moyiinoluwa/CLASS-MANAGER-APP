 const multer = require('multer')

 const storage = multer.diskStorage({
    destination: 'Assignment',
    filename: (req, file, cb) => {
        cb(null, file.originalname)
    }
 });

 const uploadAssignment = multer({ storage: storage}).single('assignment')

 module.exports = uploadAssignment