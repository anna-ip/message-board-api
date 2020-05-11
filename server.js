import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import mongoose from 'mongoose'

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/messageBoardAPi"
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise

const User = mongoose.model('User', {
  name: {
    type: String,
  },
  auhtor: {
    type: Number,  //maybe Date.now()?
    unique: true
  },
  email: {
    type: String,
    unique: true
  },
  password: {
    type: String,
    unique: true
  },
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString("hex")
  }
})

const Message = mongoose.model('Message', {
  message: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 140
  },
  author: {
    type: Number // same as from the user
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

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
  res.send('Hello world')
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

//Sign-in page
app.post('signIn', async (req, res) => {
  //get the user from the DB, checking by email & password
  const user = await User.findOne({ email: req.body.email })
  if (user && bcrypt.compareSync(req.body.password, user.password)) {
    res.json({ userId: user._id, accessToken: user.accessToken })
  } else {
    res.json({ notFound: true })
  }
})

//get the messages
app.get('/messages', authenticateUser)
app.get('/messages', (req, res) => {
  const message = await Message.find().sort({ createdAt: 'desc' }).limit(20).exec()
  res.json(message)
  // get all the messages with text, name and time
  res.json({ secret: "This is a the message page" });
})

//post a new message
app.post('/messages', (req, res) => {
  // add a new message in the list with name and time presented
  const { message } = req.body
  const newMessage = new Message({ message })

  try {
    const savedMessage = await newMessage.save()
    res.status(204).json(savedMessage)
  } catch (err) {
    res.status(400).json({ message: 'Could not save your message', error: err.errors })
  }
})

//edit a message
app.put('/messages/{id}', (req, res) => {
  //first need to identify and find the message upon author and message id
  const message = await message.findOne()
  res.status(204).json()
})

//delete a message
app.delete('messages/{id}', (req, res) => {

})



// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})