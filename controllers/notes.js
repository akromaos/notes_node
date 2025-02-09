const notesRouter = require('express').Router()
const { response } = require('express')
const Note = require('../models/note')
const User = require('../models/user')
const jwt = require('jsonwebtoken')
const { nonExistingId } = require('../tests/test_helper')

const tryParseJSONObject = jsonString => {
  try {
    const base64string = jsonString.split('.')
    const jobject1 = JSON.parse(atob(base64string[0]))
    const jobject2 = JSON.parse(atob(base64string[1]))

    if (jobject1 && typeof jobject1 === 'object' && jobject2 && typeof jobject2 === 'object') {
      return true
    }
  }
  catch (error) {
    if (error.name === "SyntaxError") {
      const e = new Error("Invalid JWT Format"); // e.name is 'Error'
      e.name = "JWTInvalidFormat"
      throw e
    }
  }
  return false
}

const getTokenFrom = request => {
  const authorization = request.get('authorization')
  if (authorization && authorization.startsWith('Bearer ')) {
    const authToken = authorization.replace('Bearer ', '')
    if (tryParseJSONObject(authToken)) {
      return authToken
    }
  }
  return null
}

const validateToken = async (decodedToken) => {
  if (!decodedToken.id) {
    return response.status(401).json({ error: "token invalid" })
  }

  const user = await User.findById(decodedToken.id)

  if (user === null) {
    response.status(400).json({errorUserId: "Invalid userID"})
  }

  return user
}

notesRouter.get('/', async (request, response) => {
  const decodedToken = jwt.verify(getTokenFrom(request), process.env.SECRET)

  const user = await validateToken(decodedToken)

  const notes = await Note.find({user: user}).populate('user', {username: 1})
  response.json(notes)
})

// TODO
notesRouter.get('/:id', async (request, response, next) => {
  const decodedToken = jwt.verify(getTokenFrom(request), process.env.SECRET)

  const user = await validateToken(decodedToken)

  Note.findById(request.params.id)
    .then(note => {
      if (note) {
        response.json(note)
      } else {
        response.status(404).end()
      }
    })
    .catch(error => next(error))
})

notesRouter.post('/', async (request, response, next) => {
  const body = request.body

  const decodedToken = jwt.verify(getTokenFrom(request), process.env.SECRET)

  const user = await validateToken(decodedToken)

  const note = new Note({
    content: body.content,
    important: body.important || false,
    user: user.id
  })

    const savedNote = await note.save()
    user.notes = user.notes.concat(savedNote._id)
    await user.save()
    
    response.status(201).json(savedNote)

})

notesRouter.delete('/:id', async (request, response, next) => {
  const decodedToken = jwt.verify(getTokenFrom(request), process.env.SECRET)

  const user = await validateToken(decodedToken)

  const note = await Note.findOneAndDelete({user: user, _id: request.params.id})
  if (note) {
    response.status(200).end()
  } else {
    response.status(404).end()
  }
})


//TODO
notesRouter.put('/:id', async (request, response, next) => {
  const decodedToken = jwt.verify(getTokenFrom(request), process.env.SECRET)

  const user = await validateToken(decodedToken)

  const body = request.body

  const note = {
    content: body.content,
    important: body.important,
  }

  Note.findOneAndUpdate({user: user, _id: request.params.id}, note, {new: true})
  .then(updatedNote => {
    response.json(updatedNote)
  })
  .catch(error => next(error))
  })
  
  // Note.findByIdAndUpdate(request.params.id, note, { new: true })


module.exports = notesRouter