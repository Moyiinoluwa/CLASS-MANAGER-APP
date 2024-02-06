const mail = require('../Service/mailer.service')


// Registration Verification mail
const verificationMail = async (email, verifyCode, username) => {
     const subject = 'Email verification'
     const body = `<!DOCTYPE HTML>
     <html>
     <head>
     </head>
     <body>
     <h1>OTP Verification</h1>
     <h1>Hello ${username}</h1>
     <h1> Your One Time Password (OTP): ${verifyCode}</h1>
     <P> This password is for a limited time</P>
     <p> If you did not request for OTP kindly ignore this message, your account is safe with us</p>
     </body>
     </html>
     `
     await mail.mailService.sendEmail(email, subject, body)
}

//verify otp mail
const verifyOtpMail = async(email, verifyCode, username)  => {
    const subject = 'Otp verification'
    const body = `<!DOCTYPE HTML>
    <html>
    <head>
    </head>
    <body>
    <h1>OTP Verification</h1>
    <h1>Hello ${username}</h1>
    <h1> Your One Time Password (OTP): ${verifyCode}</h1>
    <P> This password is for a limited time</P>
    <p> If you did not request for OTP kindly ignore this message, your account is safe with us</p>
    </body>
    </html>
    `
    await mail.mailService.sendEmail(email, subject, body)
}

const passwordResetLinkMail = async (email, verifyCode, username) => {
    const subject = 'Reset password'
    const body = `<!DOCTYPE HTML>
    <html>
    <head>
    </head>
    <body>
    <h1>Password Reset Link</h1>
    <h1>Hello ${username}</h1>
    <h1> Your password reset link is: ${verifyCode}</h1>
    <P> This password is for a limited time</P>
    <p> If you did not request for a reset link, kindly ignore this message your account is safe with us</p>
    </body>
    </html>
    `
    await mail.mailService.sendEmail(email, subject, body)
}

const teacherSendMailToStudents = async (email, username) => {
    const subject = 'Class Postponed'
    const body = `<!DOCTYPE HTML>
    <html>
    <head>
    </head>
    <body>
    <h1>Notice</h1>
    <h1>Hello ${username}</h1>
    <h1> Please be informed that the Class for today has been cancelled.</h1>
    <P> The time for the next class will be announced by your class rep</P>
    <p> Enjoy the rest of your day</p>
    <p> Thank You.</p>

    <p> Regards</p>

    <p> Mrs Caleb </p>
    </body>
    </html>
    `
    await mail.mailService.sendEmail(email, subject, body)
}


const teacherSendMailToAStudent = async (email, username) => {
    const subject = 'SEE ME!'
    const body = `<!DOCTYPE HTML>
    <html>
    <head>
    </head>
    <body>
    <h1>Hello ${username}</h1>
    <h1> You must see me before the end of today.</h1>
    <P> Failure to do so will attract punishment</P>
    <p> Enjoy the rest of your day</p>
    <p> Thank You.</p>

    <p> Regards</p>

    <p> Mr Caleb </p>
    </body>
    </html>
    `
    await mail.mailService.sendEmail(email, subject, body)
}



module.exports = {
    verificationMail,
    verifyOtpMail,
    passwordResetLinkMail,
    teacherSendMailToStudents,
    teacherSendMailToAStudent
}