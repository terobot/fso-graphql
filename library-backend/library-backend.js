const { ApolloServer, UserInputError, AuthenticationError, gql, PubSub } = require('apollo-server')
const mongoose = require('mongoose')
const config = require('./utils/config')
const Book = require('./models/book')
const Author = require('./models/author')
const User = require('./models/user')
const jwt = require('jsonwebtoken')
const pubsub = new PubSub()

mongoose.set('useFindAndModify', false)
mongoose.set('useUnifiedTopology', true)
mongoose.set('useCreateIndex', true)

console.log('connecting to MongoDB')

mongoose.connect(config.MONGODB_URI, { useNewUrlParser: true })
  .then(() => {
    console.log('connected to MongoDB')
  })
  .catch((error) => {
    console.log('error connection to MongoDB:', error.message)
  })

const typeDefs = gql`
  type User {
    username: String!
    favoriteGenre: String!
    id: ID!
  }

  type Token {
    value: String!
  }

  type Book {
    title: String!
    published: Int!
    author: Author!
    genres: [String!]!
    id: ID!
  }

  type Author {
    name: String!
    born: Int
    bookCount: Int!
    id: ID!
  }

  type Query {
    bookCount: Int!
    authorCount: Int!
    allBooks(
      author: String,
      genre: String
      ): [Book!]!
    allAuthors: [Author!]!
    me: User
  }

  type Mutation {
    addBook(
      title: String!
      author: String!
      published: Int!
      genres: [String!]!
    ): Book
    editAuthor(
      name: String!
      setBornTo: Int!
    ): Author
    createUser(
      username: String!
      favoriteGenre: String!
    ): User
    login(
      username: String!
      password: String!
    ): Token
  }

  type Subscription {
    bookAdded: Book!
  }
`

const resolvers = {
  Query: {
    bookCount: () => {
      console.log('Query: bookCount')
      Book.collection.countDocuments()
    },
    authorCount: () => {
      console.log('Query: authorCount')
      Author.collection.countDocuments()
    },
    allBooks: async (root, args) => {
      console.log('Query: allBooks')
      const author = await Author.find({ name: args.author })
      if (!args.author && !args.genre) {
        return Book.find({})
      }
      else if (args.author && !args.genre) {
        return Book.find({ author: author })
      }
      else if (!args.author && args.genre) {
        return Book.find({ genres: args.genre })
      }
      return Book.find({ author: author, genres: args.genre })
    },
    allAuthors: () => {
      console.log('Query: allAuthors')
      const authors = Author.find({})
      if (authors.length < 1) {
        return null
      }
      return authors.map(a => {
        return a
      })
    },
    me: (root, args, context) => {
      console.log('Query: me')
      return context.currentUser
    }
  },
  Book: {
    author: async root => {
      console.log('Book: author')
      const author = await Author.findById(root.author)
      return {
        name: author.name,
        born: author.born,
        bookCount: author.bookCount
      }
    }
  },
  Mutation: {
    addBook: async (root, args, context) => {
      const currentUser = context.currentUser

      if (!currentUser) {
        throw new AuthenticationError("not authenticated")
      }

      const book = new Book({ ...args })

      try {
        const author = await Author.findOne({ name : args.author })
        if (!author) {
          const newAuthor = new Author({ name: args.author, bookCount: 1 })
          const addedAuthor = await newAuthor.save()
          book.author = addedAuthor._id
        }
        else {
          author.bookCount = author.bookCount + 1
          await Author.findByIdAndUpdate(author._id, author, { new: true })
          book.author = author._id
        }
        await book.save()
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }

      pubsub.publish('BOOK_ADDED', { bookAdded: book })

      return book
    },
    editAuthor: async (root, args, context) => {
      const currentUser = context.currentUser

      if (!currentUser) {
        throw new AuthenticationError("not authenticated")
      }

      const author = await Author.findOne({ name : args.name })

      try {
        if (!author) {
          return null
        }
        author.born = args.setBornTo
        await author.save()
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }
      return author
    },
    createUser: (root, args) => {
      const user = new User({
        username: args.username,
        favoriteGenre: args.favoriteGenre
      })

      return user.save()
        .catch(error => {
          throw new UserInputError(error.message, {
            invalidArgs: args,
          })
        })
    },
    login: async (root, args) => {
      const user = await User.findOne({ username: args.username })

      if (!user || args.password !== 'salainen') {
        throw new UserInputError("wrong credentials")
      }

      const userForToken = {
        username: user.username,
        id: user._id,
      }

      return { value: jwt.sign(userForToken, config.JWT_SECRET) }
    }
  },
  Subscription: {
    bookAdded: {
      subscribe: () => pubsub.asyncIterator(['BOOK_ADDED'])
    },
  }
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const auth = req ? req.headers.authorization : null
    if (auth && auth.toLowerCase().startsWith('bearer ')) {
      const decodedToken = jwt.verify(
        auth.substring(7), config.JWT_SECRET
      )
      const currentUser = await User.findById(decodedToken.id)
      return { currentUser }
    }
  }
})

server.listen().then(({ url, subscriptionsUrl }) => {
  console.log(`Server ready at ${url}`)
  console.log(`Subscriptions ready at ${subscriptionsUrl}`)
})