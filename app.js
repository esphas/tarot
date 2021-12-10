
const fs = require('fs/promises')

const express = require('express')

const root = __dirname
const tarot = require('./src/tarot.js')(root)

const port = process.env.PORT || 3000

const app = express()

const router = express.Router()
app.use('/v1', router)

// GET /v1/draw?deck=<deck>
router.get('/draw', (req, res, next) => {
  let deck_name = req.query.deck || 'bilibili'
  let layout_name = req.query.layout || 'draw'
  let width = parseInt(req.query.width || 0)
  let height = parseInt(req.query.height || 0)
  tarot.draw_card({ deck_name, layout_name, width, height })
    .then(card => card.toBuffer())
    .then(card => res.type('image/png').send(card))
    .catch(err => next(err))
})

router.use((err, req, res, next) => {
  console.error(err)
  res.status(500).send(err.message)
})

app.listen(port, function () {
  console.log(`Now listening at http://localhost:${port}/v1/draw`)
})
