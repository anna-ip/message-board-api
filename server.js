import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import crypto from "crypto" // gives access to cryptography libraries that gives allows to create access tokens
import mongoose from 'mongoose'
import bcrypt from 'bcrypt-nodejs'

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/messageBoardApi"
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise

const User = mongoose.model('User', {
  name: {
    type: String,
  },
  email: {
    type: String,
    unique: true
  },
  password: {
    type: String,
    unique: true
  },
  //accessToken will be the Author as for the test
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString("hex")  //this will gives the user a accessToken with a unique string of characters
  }
})

const Message = mongoose.model('Message', {
  message: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 140
  },
  name: {
    type: mongoose.Schema.Types.String, //not sure if this is the right way to go need to use .populate in routes
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})


const user = new User({ name: 'Bob', email: 'bob@bob.com', password: bcrypt.hashSync('bob') })
user.save()


// this is a middleware that checks the accessToken finds a user that matches a registrated user
const authenticateUser = async (req, res, next) => {
  try {
    const user = await User.findOne({
      accessToken: req.header('Authorization')
    });
    if (user) {
      req.user = user
      next()
    } else {
      res.status(401).json({ loggedOut: true })
    }
  } catch (err) {
    res
      .status(403)
      .json({ message: 'Accesstoken missing or wrong', errors: err.errors })
  }
}

// Defines the port the app will run on. Defaults to 8080, but can be 
// overridden when starting the server. For example:
//
//   PORT=9000 npm start
const port = process.env.PORT || 8080
const app = express()

// Add middlewares to enable cors and json body parsing
app.use(cors())
app.use(bodyParser.json())

// Start defining your routes here
app.get('/', (req, res) => {
  res.send('Hello message board')
})

//register form
app.post('/', async (req, res) => {
  try {
    const { name, email, password } = req.body
    //the bcrypt.... makes the password stored on the database as an bcrypt hash value of the password
    const user = new User({ name, email, password: bcrypt.hashSync(password) })
    //saves the user
    user.save()
    //if success = the json returns the users id (maybe id should be the author??)and accesToken
    res.status(201).json({ id: user._id, accessToken: user.accessToken })
  } catch (err) {
    res
      .status(400)
      .json({ message: "Could not create user", errors: err.errors })
  }
})

//Sign-in 
app.post('signIn', async (req, res) => {
  //get the user from the DB, checking by email & password
  const user = await User.findOne({ name: name, email: req.body.email })
  // if user & the sent/written password matches the password in the database then...
  if (user && bcrypt.compareSync(req.body.password, user.password)) {
    //success
    res.json({ userId: user._id, accessToken: user.accessToken })
  } else {
    // fails if user doesnt exist or the encrypted password dont match
    res.json({ notFound: true })
  }
})

//get the messages
app.get('/messages', authenticateUser) // maybe dont need a authenticateUser here to see all the messages sent
app.get('/messages', async (req, res) => {
  const message = Message.find().sort({ createdAt: 'desc' }).limit(20).exec()
  res.json(message)
  // get all the messages with text, name and time
  //res.json({ secret: "This is a the message page" });
})

//post a new message
app.post('/messages', authenticateUser)
app.post('/messages', async (req, res) => {
  // add a new message in the list with name and time presented plus author and id
  const { message } = req.body
  const newMessage = new Message({ message })

  try {
    const savedMessage = await newMessage.save()
    res.status(204).json(savedMessage)
  } catch (err) {
    res.status(400).json({ message: 'Could not save your message', error: err.errors })
  }
})

//edit a message //first need to identify and find the message upon acesstoken and message id
app.put('/messages/:id', authenticateUser)
// this will only happens if the next() function is called from the middleware
app.put('/messages/:id', async (req, res) => {
  try {
    const message = await message.findOneAndUpdate(
      { "_id": req.params.id }, //filters & is required
      { $inc: { "message": req.params.body } }, //updates & is required
      { new: true } //updates the messages
    )
    res.status(204).json(like)
  } catch (err) {
    res.status(400).json({ message: 'Could not save your like', error: err.errors })
  }

  //or this version 
  // try {
  //   const { name, accesstoken, message, id } = req.body
  //   const newMessage = new Message({ name, message, accesstoken, id })
  //   //saves the message
  //   newMessage.save()
  //   //if success = the json returns the message id (maybe id should be the accesstoken??)
  //   res.status(204).json({ id: message._id, name: message.name, accestoken: message.accesstoken, message: message.message })
  // } catch (err) {
  //   res
  //     .status(400)
  //     .json({ message: "Could not update message", errors: err.errors })
  // }
})

//find a message by id and accesstoken and delete the message

app.delete('messages/{id}', authenticateUser)
app.delete('messages/{id}', (req, res) => {
  try {
    res.status(204).json()
  } catch (err) {
    res.status(400).json({ message: 'Could not delete your message', error: err.errors })
  }
})



// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})