import React, { useState } from 'react'
import { Query, ApolloConsumer } from 'react-apollo'
import { gql } from 'apollo-boost'
import { useQuery, useMutation, useSubscription, useApolloClient } from '@apollo/react-hooks'
import Authors from './components/Authors'
import Books from './components/Books'
import NewBook from './components/NewBook'
import Login from './components/Login'
import Recommendations from './components/Recommendations'

const BOOK_DETAILS = gql`
  fragment BookDetails on Book {
    title 
    author {name}
    published
    genres
  }
`

const ALL_AUTHORS = gql`
  {
    allAuthors {
      name
      born
      bookCount
    }
  }
`
const ALL_BOOKS = gql`
  {
    allBooks { 
      title 
      author {name}
      published
      genres
    }
  }
`

const CREATE_BOOK = gql`
  mutation createBook($title: String!, $author: String!, $published: Int!, $genres: [String!]!) {
    addBook(
      title: $title,
      author: $author,
      published: $published,
      genres: $genres
    ) {
      title,
      author {name},
      published,
      genres
    }
  }
`

const EDIT_AUTHOR = gql`
  mutation editNumber($name: String!, $born: Int!) {
    editAuthor(name: $name, setBornTo: $born) {
      name
      born
    }
  }
`

const LOGIN = gql`
  mutation login($username: String!, $password: String!) {
    login(username: $username, password: $password)  {
      value
    }
  }
`

const ME = gql`
  {
    me {
      username,
      favoriteGenre
    }
  }
`

const BOOK_ADDED = gql`
  subscription {
    bookAdded {
      ...BookDetails
    }
  }
  
${BOOK_DETAILS}
`

const App = () => {
  const [page, setPage] = useState('authors')
  const [token, setToken] = useState(localStorage.getItem('user-token'))
  const [errorMessage, setErrorMessage] = useState(null)

  const handleError = (error) => {
    console.log(error.graphQLErrors)
    if (error.graphQLErrors.length > 0) {
      setErrorMessage(error.graphQLErrors[0].message)
    }
    setTimeout(() => {
      setErrorMessage(null)
    }, 10000)
  }

  const updateCacheWith = (addedBook) => {
    const includedIn = (set, object) => 
      set.map(p => p.id).includes(object.id)  

    const dataInStore = client.readQuery({ query: ALL_BOOKS })
    if (!includedIn(dataInStore.allBooks, addedBook)) {
      client.writeQuery({
        query: ALL_BOOKS,
        data: { allBooks : dataInStore.allBooks.concat(addedBook) }
      })
    }   
  }

  useSubscription(BOOK_ADDED, {
    onSubscriptionData: ({ subscriptionData }) => {
      const addedBook = subscriptionData.data.bookAdded
      window.alert(`${addedBook.title} added`)
      updateCacheWith(addedBook)
    }
  })

  const client = useApolloClient()

  const authors = useQuery(ALL_AUTHORS)
  const books = useQuery(ALL_BOOKS)
  const user = useQuery(ME, {
    fetchPolicy: 'no-cache'
  })
  const [addBook] = useMutation(CREATE_BOOK, {
    refetchQueries: [
      { query: ALL_BOOKS },
      { query: ALL_AUTHORS }
    ],
    errorPolicy: 'all',
    onError: handleError,
    update: (store, response) => {
      updateCacheWith(response.data.addBook)
    }
  })
  const [editAuthor] = useMutation(EDIT_AUTHOR, {
    refetchQueries: [
      { query: ALL_AUTHORS }
    ],
    errorPolicy: 'all',
    onError: handleError
  })

  const [login] = useMutation(LOGIN, {
    errorPolicy: 'all',
    onError: handleError
  })

  const logout = () => {
    setToken(null)
    localStorage.clear()
    client.resetStore()
    setPage('authors')
  }

  const errorNotification = () => errorMessage &&
    <div style={{ color: 'red' }}>
      {errorMessage}
    </div>

  const navigationButtons = (token) => {
    if (token) {
      return <div>
        <button onClick={() => setPage('authors')}>authors</button>
        <button onClick={() => setPage('books')}>books</button>
        <button onClick={() => setPage('add')}>add book</button>
        <button onClick={() => setPage('recommendations')}>recommendations</button>
        <button onClick={() => logout()}>logout</button>
      </div>
    }
    return <div>
      <button onClick={() => setPage('authors')}>authors</button>
      <button onClick={() => setPage('books')}>books</button>
      <button onClick={() => setPage('login')}>login</button>
    </div>
  }

  return (
    <div>
      {navigationButtons(token)}

      {errorNotification()}

      <Authors
        result={authors}
        show={page === 'authors'}
        editAuthor={editAuthor}
        token={token}
      />

      <ApolloConsumer>
        {(client => 
          <Query query={ALL_BOOKS}>
            {(result) => 
              <Books
                result={result}
                client={client}
                show={page === 'books'}
              />
            }
          </Query> 
        )}
      </ApolloConsumer>

      <NewBook
        addBook={addBook}
        show={page === 'add'}
      />

      <Recommendations
        result={books}
        user={user}
        show={page === 'recommendations'}
      />

      <Login
        login={login}
        setToken={setToken}
        setPage={setPage}
        show={page === 'login'}
      />

    </div>
  )
}

export default App