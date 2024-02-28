 const asyncHandler = require('express-async-handler')
 const jwt = require('jsonwebtoken')

 const validate = asyncHandler(async (req, res, next) => {
    let token;
    let authHeader = req.headers.authorization;
    if(authHeader && authHeader.startsWith('Bearer')) {
        token = authHeader.split(' ')[1]
    
    jwt.verify(token, process.env.ACCESS_KEY, (err, decoded) => {
        if(err) {
            res.status(401).json({ message: 'Unauthorized, please log in'})
        }
        req.user = decoded.user
        next()
    });
} else {
    res.status(401).json({ message: 'User is not authorized'})
}
 });

 module.exports = validate;