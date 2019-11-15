import React, { useState } from 'react'
import Select from 'react-select';

const Authors = (props) => {
  const [name, setName] = useState('')
  const [born, setBorn] = useState('')

  if (!props.show) {
    return null
  }
  if (props.result.loading) {
    return <div>loading...</div>
  }

  const authors = props.result.data.allAuthors

  const submit = async (e) => {
    e.preventDefault()

    const bornInt = parseInt(born)
    await props.editAuthor({
      variables: { name, born: bornInt }
    })

    setBorn('')
  }

  const options = authors.map(a => {
    return { value: a.name, label: a.name }
  })

  const setBornStyle = {
    display:props.token ? '' : 'none'
  }

  return (
    <div>
      <h2>authors</h2>
      <table>
        <tbody>
          <tr>
            <th></th>
            <th>
              born
            </th>
            <th>
              books
            </th>
          </tr>
          {authors.map(a =>
            <tr key={a.name}>
              <td>{a.name}</td>
              <td>{a.born}</td>
              <td>{a.bookCount}</td>
            </tr>
          )}
        </tbody>
      </table>

      <h2 style={setBornStyle}>Set birthyear</h2>
      <form style={setBornStyle} onSubmit={submit}>
        <div>
          <Select
            value={options.find(o => o.value === name)}
            onChange={({ value }) => {
              setName(value)
            }}
            options={options}
          />
        </div>
        <div>
          born
          <input
            type='number'
            value={born}
            onChange={({ target }) => setBorn(target.value)}
          />
        </div>
        <button type='submit'>update author</button>
      </form>
    </div>
  )
}

export default Authors