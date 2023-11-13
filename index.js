require('dotenv').config()
const express = require('express')
const app = express()
const cors = require('cors')
const Note = require('./models/note')
const mongoose = require('mongoose')


  const unknownEndpoint = (request, response) => {
    response.status(404).send({ error: 'unknown endpoint' })
  }

  const noteChecker = (request, response, next) => {
    if (!mongoose.isValidObjectId(request.params.id)) {
     return response.status(404).send({error: 'invalid note id'})
    }
    next()
  }

  const requestLogger = (request, response, next) => {
    console.log('Method:', request.method)
    console.log('Path:  ', request.path)
    console.log('Body:  ', request.body)
    console.log('---')
    next()
  }

  app.use(express.static('dist'))
  app.use(express.json())
  app.use(cors())
  app.use(requestLogger)
  
  app.get('/', (request, response) => {
    response.send('<h1>Hello World!</h1>')
  })
  
  app.get('/api/notes', (request, response) => {
    Note.find({}).then(notes => {
      response.json(notes)
    })
  })

  app.get('/api/notes/:id', noteChecker, (request, response) => {
    
    Note.findById(request.params.id).then(note => {
        if (note) {
          response.json(note)
        } else {
          response.status(404).end()
        }
    }).catch(error => {
        console.log(error)
        response.status(500).end()
    })
  })

  app.put('/api/notes/:id', noteChecker, (request, response) => {
    const body = request.body

    const note = {
      content: body.content,
      important: body.important,
    }

    Note.findByIdAndUpdate(request.params.id, note, {new: true}).then(updatedNote => {
      response.json(updatedNote)
    }).catch(error => next(error))
    
  })

  app.delete('/api/notes/:id', noteChecker, (request, response) => {
    Note.findByIdAndRemove(request.params.id)
    .then(result => {
      response.status(204).end()
    })
    .catch(error => next(error))
  })

  
  app.post('/api/notes', (request, response) => {
    const body = request.body
  
    if (!body.content) {
      return response.status(400).json({ 
        error: 'content missing' 
      })
    }
    
    const note = new Note({
      content: body.content,
      important: body.important || false,
    })
  
    note.save().then(savedNote => {
      response.json(savedNote)
    })
  })
  
app.use(unknownEndpoint)

const errorHandler = (error, request, response, next) => {
  console.error(error.message)

  if (error.name === 'CastError') {
    return response.status(400).send({ error: 'malformatted id' })
  } 

  next(error)
}

app.use(errorHandler)

  const PORT = process.env.PORT
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
