import dbConnect from '@/lib/dbConnect';
import UserModel from '@/model/User';
import bcrypt from 'bcryptjs';
import { sendVerificationEmail } from '@/helpers/sendVerificationEmails';


export async function POST(Request: Request) {
    await dbConnect();

    try {
        const { username, email, password } = await Request.json();
    
        const existingVerifiedUserByUsername = await UserModel.findOne({
            username,
            isVerified: true,
          });

        if(existingVerifiedUserByUsername) {
            return Response.json({ success: false, message: 'Username already exists.' },{ status: 400 });
        } 


        const existingUserByEmail = await UserModel.findOne({ email });
        let verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
    
        if (existingUserByEmail) {
          if (existingUserByEmail.isVerified) {
            return Response.json(
              {
                success: false,
                message: 'User already exists with this email',
              },
              { status: 400 }
            );
          } else {
            const hashedPassword = await bcrypt.hash(password, 10);
            existingUserByEmail.username = username;
            existingUserByEmail.password = hashedPassword;
            existingUserByEmail.verifyCode = verifyCode;
            existingUserByEmail.verifyCodeExpiry = new Date(Date.now() + 3600000); // 2 methods to set expiary as 1 hr
            await existingUserByEmail.save();
          }
        } else {
          const hashedPassword = await bcrypt.hash(password, 10);
          const expiryDate = new Date();
          expiryDate.setHours(expiryDate.getHours() + 1);

    
          const newUser = new UserModel({
            username,
            email,
            password: hashedPassword,
            verifyCode,
            verifyCodeExpiry: expiryDate,
            isVerified: false,
            isAcceptingMessages: true,
            messages: [],
          });

          await newUser.save();
          console.log("reached here");
        }
    
        // Send verification email
        const emailResponse = await sendVerificationEmail(
          email,
          username,
          verifyCode
        );

        if (!emailResponse.success) {
          console.error('Error sending verification email:', emailResponse.message);
          return Response.json(
            {
              success: false,
              message: emailResponse.message,
            },
            { status: 500 }
          );
        }
    
        return Response.json(
          {
            success: true,
            message: 'User registered successfully. Please verify your account.',
          },
          { status: 201 }
        );


    } catch (error) {
        console.error('Error registering user:', error);
        return Response.json({ success: false, message: 'Error  registering user.' },{ status: 500 });  
    }
}