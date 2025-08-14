import React, { useState } from 'react'
import NetworkBackground from './components/NetworkBackground'
import Header from './components/Header'
import LandingPage from './components/LandingPage'
import SearchForm from './components/SearchForm'
import PropertyResearch from './components/PropertyResearch'
import Recommendations from './components/Recommendations'
import OnboardingFlow from './components/OnboardingFlow'
import CompletionModal from './components/CompletionModal'
import './App.css'

function App() {
  const [searchData, setSearchData] = useState({
    location: '',
    investmentThesis: '',
    searchType: 'location'
  })
  const [showResults, setShowResults] = useState(false)
  const [showLanding, setShowLanding] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [userData, setUserData] = useState(null)

  const handleSearch = (data) => {
    setSearchData(data)
    setShowResults(true)
  }

  const handleStartOnboarding = () => {
    setShowLanding(false)
    setShowOnboarding(true)
  }

  const handleOnboardingComplete = (data) => {
    setUserData(data)
    setShowOnboarding(false)
    setShowCompletionModal(true)
  }

  const handleModalClose = () => {
    setShowCompletionModal(false)
    setShowLanding(false) // After completing onboarding, show the main app
  }

  return (
    <div className="app">
      <NetworkBackground />
      <div className="app-content">
        <Header />
        {showLanding && <LandingPage onStartOnboarding={handleStartOnboarding} />}
        {!showLanding && !showOnboarding && <SearchForm onSearch={handleSearch} />}
        {showResults && !showLanding && !showOnboarding && (
          <>
            <PropertyResearch searchData={searchData} />
            <Recommendations searchData={searchData} />
          </>
        )}
      </div>
      
      {showOnboarding && (
        <OnboardingFlow onComplete={handleOnboardingComplete} />
      )}
      
      <CompletionModal 
        isOpen={showCompletionModal}
        onClose={handleModalClose}
        userData={userData}
      />
    </div>
  )
}

export default App
