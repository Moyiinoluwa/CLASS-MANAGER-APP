 const multer =  require('multer')

 const storage = multer.diskStorage({
    destination: 'Assignments',
    filename: (req, file, cb) => {
        cb(null, file.originalname)
    }
 });

 const homeWork = multer({ storage: storage}).single('assignment')

 module.exports = homeWork