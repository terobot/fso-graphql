import React, { useState } from 'react'
import { gql } from 'apollo-boost'

const FIND_BOOKS = gql`
  query findBooksByGenre($genreToSearch: String) {
    allBooks(genre: $genreToSearch) { 
      title 
      author {name}
      published
      genres
    }
  }
`

const Books = (props) => {
  const [genre, setGenre] = useState('all genres')
  const [booksToShow, setBooksToShow] = useState(null)
  const [previousBooksCount, setPreviousBooksCount] = useState(null)

  if (!props.show) {
    return null
  }

  if (props.result.loading) {
    return <div>loading...</div>
  }

  const showGenre = async (genre) => {
    const genreToSearch = genre === 'all genres' ? null : genre
    const { data } = await props.client.query({
      query: FIND_BOOKS,
      variables: { genreToSearch: genreToSearch },
      fetchPolicy: 'no-cache'
    })
    setBooksToShow(data.allBooks)
    setGenre(genre)
  }

  const books = props.result.data.allBooks
  const genresOfBooks = books.map(b => b.genres).flat()
  const setOfgenres = new Set(genresOfBooks)
  const genres = [...setOfgenres, 'all genres']
  const genreButtons = () => {
    return genres.map(b => 
      <button key={b} onClick={() => showGenre(b)}>{b}</button>
    )
  }
  const booksTable = (booksToShow) => {
    if (!booksToShow || previousBooksCount !== books.length) {
      showGenre(genre)
      if (previousBooksCount !== books.length) {
        setPreviousBooksCount(books.length)
      }
      return null
    }
    return <div>
      <h2>books</h2> 
      <p>in genre <strong>{genre}</strong></p>
      <table>
        <tbody>
          <tr>
            <th></th>
            <th>
              author
            </th>
            <th>
              published
            </th>
          </tr>
          {booksToShow.map(a =>
            <tr key={a.title}>
              <td>{a.title}</td>
              <td>{a.author.name}</td>
              <td>{a.published}</td>
            </tr>
          )}
        </tbody>
      </table>
      {genreButtons()}
    </div>
  }

  return (
    booksTable(booksToShow)
  )
}

export default Books