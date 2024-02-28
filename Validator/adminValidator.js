const joi = require('joi')

 const validator = (schema) => (payload) =>
 schema.validate(payload, { aborteEarly: false })

 //register admin
 const registerAdminValidator = joi.object({
    username: joi.string().lowercase().required(),
    email: joi.string().email().required(),
    password: joi.string().min(8).max(16).required()
 });

//login 
const loginAdminValidator = joi.object({
    email: joi.string().email().lowercase().required(),
    password: joi.string().min(8).max(16).required()
});

//verify otp
const verifyAdminOtpValidator = joi.object({
    email: joi.string().email().lowercase().required(),
    otp: joi.string().min(6).max(6).required()
});

//resend otp
const resendAdminOtpValidator = joi.object({
    email: joi.string().email().lowercase().required()
})

//send reset password link
const resetAdminPasswordLinkValidator = joi.object({
    email: joi.string().email().lowercase().required()
});

//reset password
const sendAdminPasswordValidator = joi.object({
    email: joi.string().email().lowercase().required(),
    password: joi.string().min(8).max(16).required()
});

//change password
const changeAdminPasswordValidator = joi.object({
    email: joi.string().email().lowercase().required(),
    oldPassword: joi.string().min(8).max(16).required()
});

//update admin
const updateAdminValidator = joi.object({
    
});

 exports.registerAdminValidator = validator(registerAdminValidator)
 exports.loginAdminValidator = validator(loginAdminValidator)
 exports.verifyAdminOtpValidator = validator(verifyAdminOtpValidator)
 exports.resendAdminOtpValidator = validator(resendAdminOtpValidator)
 exports.resetAdminPasswordLinkValidator = validator(resetAdminPasswordLinkValidator)
 exports.sendAdminPasswordValidator = validator(sendAdminPasswordValidator)
 exports.changeAdminPasswordValidator = validator(changeAdminPasswordValidator)