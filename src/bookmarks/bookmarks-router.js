const path = require('path')
const express = require('express')
const { isWebUri } = require('valid-url')
const xss = require('xss')
const BookmarksService = require('./bookmarks-service')

const bookmarksRouter = express.Router()
const bodyParser = express.json()

bookmarksRouter
  .route('/')
  .get((req, res, next) => {
    BookmarksService.getAllBookmarks(
      req.app.get('db')
    )
      .then(bookmarks => {
        res
        .status(200)
        .json(bookmarks.map(bookmark => {
          return {
            id: bookmark.id,
            title: xss(bookmark.title),
            url: xss(bookmark.url),
            description: xss(bookmark.description),
            rating: Number(bookmark.rating)
          }

        }))
      })
      .catch(next)
  })
  .post(bodyParser, (req, res, next) => {
    for (const field of ['title', 'url', 'rating']) {
      if (!req.body[field]) {
        return res.status(400).send(`'${field}' is required`)
      }
    }

    const { title, url, description, rating } = req.body

    if (!Number.isInteger(rating) || rating < 0 || rating > 5) {
      return res.status(400).send(`'rating' must be a number between 0 and 5`)
    }

    if (!isWebUri(url)) {
      return res.status(400).send(`'url' must be a valid URL`)
    }

    const newBookmark = { title, url, description, rating }

    BookmarksService.insertBookmark(
      req.app.get('db'),
      newBookmark
    )
      .then(bookmark => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl,`/${bookmark.id}`))
          .json({
            id: bookmark.id,
            title: xss(bookmark.title),
            url: bookmark.url,
            description: xss(bookmark.description),
            rating: Number(bookmark.rating),
          })
      })
      .catch(next)
  })

bookmarksRouter
  .route('/:bookmark_id')
  .all((req, res, next) => {
    const { bookmark_id } = req.params
    BookmarksService.getById(req.app.get('db'), bookmark_id)
      .then(bookmark => {
        if (!bookmark) {
          return res.status(404).json({
            error: { message: `Bookmark Not Found` }
          })
        }
        res.bookmark = bookmark
        next()
      })
      .catch(next)

  })
  .get((req, res) => {
    res.json({
      id: res.bookmark.id,
      title: xss(res.bookmark.title),
      url: res.bookmark.url,
      description: xss(res.bookmark.description),
      rating: Number(res.bookmark.rating),
    })
  })
  .delete((req, res, next) => {
    const { bookmark_id } = req.params
    BookmarksService.deleteBookmark(
      req.app.get('db'),
      bookmark_id
    )
      .then(numRowsAffected => {
        res.status(204).end()
      })
      .catch(next)
  })
  .patch(bodyParser, (req, res, next) => {
    const { title, url, description, rating } = req.body
    const bookmarkValidation = { title, url, rating }
    const updatedBookmark = { title, url, description, rating}

    const numOfValues = Object.values(bookmarkValidation).filter(Boolean).length
    if (numOfValues === 0) {
      return res.status(400).json({
        error: {
          message: `Request body must contain either 'title', 'url', or 'rating'`
        }
      })
      }
      BookmarksService.updateBookmark(
        req.app.get('db'),
        req.params.bookmark_id,
        updatedBookmark
      )
        .then(numRowsAffected => {
          res.status(204).end()
        })
        .catch(next)
  })

module.exports = bookmarksRouter
