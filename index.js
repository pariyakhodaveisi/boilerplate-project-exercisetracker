const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const bodyParser = require('body-parser');
const mongoose = require("mongoose");

// MongoDB connection
const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connection established'))
    .catch(err => console.error('MongoDB connection error:', err));

// Schema for Users
const Schema = mongoose.Schema;
const userSchema = new Schema({
    username: { type: String, required: true }
});
const userModel = mongoose.model('user', userSchema); // Pass the schema to create the model

// Schema for exercises
const exerciseSchema = new Schema({
    userId: { type: String, required: true },
    description: { type: String, required: true },
    duration: { type: Number, required: true },
    date: { type: Date, default: Date.now }
});
const exerciseModel = mongoose.model('exercise', exerciseSchema); // Corrected model name

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));

// Routes
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});

app.post('/api/users', (req, res) => {
    const { username } = req.body;
    const newUser = new userModel({ username });
    newUser.save()
        .then(savedUser => res.json(savedUser))
        .catch(err => res.status(400).json({ error: err.message }));
});

app.get('/api/users', (req, res) => {
    userModel.find({})
        .then(users => res.json(users))
        .catch(err => res.status(400).json({ error: err.message }));
});

app.post('/api/users/:_id/exercises', (req, res) => {
    const { _id } = req.params;
    userModel.findById(_id)
        .then(user => {
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            const { description, duration, date } = req.body;
            const newExercise = new exerciseModel({
                userId: _id,
                description,
                duration,
                date: date ? new Date(date) : new Date()
            });
            newExercise.save()
                .then(savedExercise => {
                    res.json({
                        _id: user._id,
                        username: user.username,
                        description: savedExercise.description,
                        duration: savedExercise.duration,
                        date: savedExercise.date.toDateString()
                    });
                })
                .catch(err => res.status(400).json({ error: err.message }));
        })
        .catch(err => res.status(400).json({ error: err.message }));
});

app.get('/api/users', (req, res)=>{
  userModel.find({}).then((users) => {
    res.json(users);
  })
})

app.get('/api/users/:_id/logs', async (req, res) => {
  try {
      const userId = req.params._id;
      
      // Extract query parameters
      let limitParam = req.query.limit;
      let toParam = req.query.to;
      let fromParam = req.query.from;

      // Parse limitParam into an integer if provided
      limitParam = limitParam ? parseInt(limitParam) : null;

      // Construct initial query object
      let queryObj = { userId };

      // Add optional date filters if provided
      if (fromParam || toParam) {
          queryObj.date = {};
          if (fromParam) queryObj.date.$gte = new Date(fromParam);
          if (toParam) queryObj.date.$lte = new Date(toParam);
      }

      // Find the user by ID
      const user = await userModel.findById(userId);
      if (!user) {
          return res.status(404).json({ error: 'User not found' });
      }
      
      const username = user.username;

      // Find exercises for the user with optional parameters
      let exercises = await exerciseModel.find(queryObj).limit(limitParam);

      // Modify each exercise object
      exercises = exercises.map((x) => {
          return {
              description: x.description,
              duration: x.duration,
              date: x.date.toDateString()
          };
      });

      // Create response object
      const responseObj = {
          _id: user._id,
          username: username,
          log: exercises,
          count: exercises.length
      };

      res.json(responseObj);
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
  }
});


// Server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Your app is listening on port ${PORT}`);
});
