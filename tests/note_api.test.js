const mongoose = require('mongoose')
const supertest = require('supertest')
const helper = require('./test_helper')
const app = require('../app')
const api = supertest(app)
const Note = require('../models/note')
const bcrypt = require('bcrypt')
const User = require('../models/user')
const assert = require('assert')


beforeEach(async () => {
    // Start fresh with notes
    await Note.deleteMany({})
  
    // Create initial notes
    const noteObjects = helper.initialNotes.map(note => new Note(note))
    const promiseArray = noteObjects.map(note => note.save())
    await Promise.all(promiseArray)

    // start fresh with users
    await User.deleteMany({})
  
    // Create initial root user for testing
    const passwordHash = await bcrypt.hash('sekret', 10)
    const user = new User({ username: 'root', passwordHash })

    // Store user id to map to notes that were created previously
    const user_id = await user.save()
    await Note.updateMany({}, { $set: { user: user_id._id} });
  
  })

  describe('when there is initially one user in db', () => {
  
    test('creation succeeds with a fresh username', async () => {
      const usersAtStart = await helper.usersInDb()
  
      const newUser = {
        username: 'mluukkai',
        name: 'Matti Luukkainen',
        password: 'salainen',
      }
  
      await api
        .post('/api/users')
        .send(newUser)
        .expect(201)
        .expect('Content-Type', /application\/json/)
  
      const usersAtEnd = await helper.usersInDb()
      expect(usersAtEnd).toHaveLength(usersAtStart.length + 1)
  
      const usernames = usersAtEnd.map(u => u.username)
      expect(usernames).toContain(newUser.username)
    })

    test('creation fails with proper statuscode and message if username already taken', async () => {
      const usersAtStart = await helper.usersInDb()
  
      const newUser = {
        username: 'root',
        name: 'Superuser',
        password: 'salainen',
      }
  
      const result = await api
        .post('/api/users')
        .send(newUser)
        .expect(400)
        .expect('Content-Type', /application\/json/)
  
      const usersAtEnd = await helper.usersInDb()
      assert(result.body.error.includes('expected `username` to be unique'))
  
      assert.strictEqual(usersAtEnd.length, usersAtStart.length)
    })
  })

test('notes are returned as json', async () => {
  const userCred = {
    username: 'root',
    password: 'sekret'
  }

  const userToken = (await api.post('/api/login').send(userCred))._body.token

  await api
    .get('/api/notes')
    .set('Authorization', 'Bearer ' + userToken)
    .expect(200)
    .expect('Content-Type', /application\/json/)
})

test('all notes are returned', async () => {
  const userCred = {
    username: 'root',
    password: 'sekret'
  }

  const userToken = (await api.post('/api/login').send(userCred))._body.token

  const response = await api.get('/api/notes').set('Authorization', 'Bearer ' + userToken)
  
    expect(response.body).toHaveLength(helper.initialNotes.length)
  })
  
  test('a specific note is within the returned notes', async () => {
    const userCred = {
      username: 'root',
      password: 'sekret'
    }
  
    const userToken = (await api.post('/api/login').send(userCred))._body.token

    const response = await api.get('/api/notes').set('Authorization', 'Bearer ' + userToken)
  
    const contents = response.body.map(r => r.content)
    expect(contents).toContain(
      'Browser can execute only JavaScript'
    )
  })

test('a valid note can be added', async () => {
    const newNote = {
        content: 'async/await simplifies making async calls',
        important: true,
        user: 'root'
      }

    const userCred = {
      username: 'root',
      password: 'sekret'
    }

    const userToken = (await api.post('/api/login').send(userCred))._body.token
    
      await api
        .post('/api/notes')
        .send(newNote)
        .set('Authorization', 'Bearer ' + userToken)
        .expect(201)
        .expect('Content-Type', /application\/json/)
    
      const notesAtEnd = await helper.notesInDb()
      expect(notesAtEnd).toHaveLength(helper.initialNotes.length + 1)
    
      const contents = notesAtEnd.map(n => n.content)
      expect(contents).toContain(
        'async/await simplifies making async calls'
      )
    })

  test('note without content is not added', async () => {
    const newNote = {
        important: true,
        user: 'root'
      }
      const userCred = {
        username: 'root',
        password: 'sekret'
      }
  
      const userToken = (await api.post('/api/login').send(userCred))._body.token
    
      await api
        .post('/api/notes')
        .set('Authorization', 'Bearer ' + userToken)
        .send(newNote)
        .expect(400)
    
      const notesAtEnd = await helper.notesInDb()
    
      expect(notesAtEnd).toHaveLength(helper.initialNotes.length)
    })

    test('access without a token fails and returns 401', async () => {
      const newNote = {
        important: true,
        user: 'root'
      }

      // Read requests
      await api.get('/api/notes').expect(401)

      // Write Requests
      await api
        .post('/api/notes')
        .send(newNote)
        .expect(401)
    })
    


    afterAll(async () => {
        await User.deleteMany({})
        await Note.deleteMany({})
        await mongoose.connection.close()
      })