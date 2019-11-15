import React from 'react'

const Recommendations = (props) => {
  if (!props.show) {
    return null
  }
  if (props.result.loading) {
    return <div>loading...</div>
  }

  const genre = props.user.data.me.favoriteGenre
  const books = props.result.data.allBooks
  const filteredBooks = books.filter(b => b.genres.includes(genre))
  const booksToShow = filteredBooks

  return (
    <div>
      <h2>books</h2>

      <p>books in your favorite genre <strong>{genre}</strong></p>
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
    </div>
  )
}

export default Recommendations