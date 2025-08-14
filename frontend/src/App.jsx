import React, { useState } from 'react'
import NetworkBackground from './components/NetworkBackground'
import Header from './components/Header'
import SearchForm from './components/SearchForm'
import PropertyResearch from './components/PropertyResearch'
import Recommendations from './components/Recommendations'
import './App.css'

function App() {
  const [searchData, setSearchData] = useState({
    location: '',
    investmentThesis: '',
    searchType: 'location'
  })
  const [showResults, setShowResults] = useState(false)

  const handleSearch = (data) => {
    setSearchData(data)
    setShowResults(true)
  }

  return (
    <div className="app">
      <NetworkBackground />
      <div className="app-content">
        <Header />
        <SearchForm onSearch={handleSearch} />
        {showResults && (
          <>
            <PropertyResearch searchData={searchData} />
            <Recommendations searchData={searchData} />
          </>
        )}
      </div>
    </div>
  )
}

export default App
