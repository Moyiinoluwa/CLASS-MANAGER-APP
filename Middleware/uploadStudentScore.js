const multer = require('multer')

const storage = multer.diskStorage({
    destination: 'Student-scores',
    filename: (req, file, cb) => {
        cb(null, file.originalname)
    }
});

const studentScore = multer({ storage: storage}).single('scores')

module.exports = studentScore