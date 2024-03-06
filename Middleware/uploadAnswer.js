const multer = require('multer')

const storage = multer.diskStorage({
    destination: 'Answers',
    filename: ((req, file, cb) => {
        cb(null, file.originalname)
    })
});

const sendAnswer = multer({ storage: storage}).single('answer')

module.exports = sendAnswer;