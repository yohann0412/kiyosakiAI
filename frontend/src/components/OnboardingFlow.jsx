import React, { useState } from 'react'
import './OnboardingFlow.css'

const OnboardingFlow = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    investmentGoals: '',
    budget: '',
    timeline: '',
    experience: '',
    riskTolerance: ''
  })

  const steps = [
    {
      title: "Welcome to Kiyosaki",
      subtitle: "Let's get to know you better",
      fields: [
        { name: 'firstName', label: 'First Name', type: 'text', placeholder: 'Enter your first name', required: true },
        { name: 'lastName', label: 'Last Name', type: 'text', placeholder: 'Enter your last name', required: true },
        { name: 'email', label: 'Email', type: 'email', placeholder: 'Enter your email address', required: true },
        { name: 'phone', label: 'Phone', type: 'tel', placeholder: 'Enter your phone number', required: false }
      ]
    },
    {
      title: "Investment Goals",
      subtitle: "What are you looking to achieve?",
      fields: [
        { 
          name: 'investmentGoals', 
          label: 'Primary Investment Goal', 
          type: 'select', 
          required: true,
          options: [
            { value: '', label: 'Select your primary goal' },
            { value: 'cash-flow', label: 'Generate passive cash flow' },
            { value: 'appreciation', label: 'Long-term appreciation' },
            { value: 'fix-flip', label: 'Fix and flip properties' },
            { value: 'portfolio-diversification', label: 'Portfolio diversification' },
            { value: 'tax-benefits', label: 'Tax advantages' }
          ]
        },
        { 
          name: 'budget', 
          label: 'Investment Budget', 
          type: 'select', 
          required: true,
          options: [
            { value: '', label: 'Select your budget range' },
            { value: 'under-100k', label: 'Under $100,000' },
            { value: '100k-250k', label: '$100,000 - $250,000' },
            { value: '250k-500k', label: '$250,000 - $500,000' },
            { value: '500k-1m', label: '$500,000 - $1,000,000' },
            { value: 'over-1m', label: 'Over $1,000,000' }
          ]
        }
      ]
    },
    {
      title: "Investment Preferences",
      subtitle: "Tell us about your investment style",
      fields: [
        { 
          name: 'timeline', 
          label: 'Investment Timeline', 
          type: 'select', 
          required: true,
          options: [
            { value: '', label: 'Select your timeline' },
            { value: 'immediate', label: 'Ready to invest immediately' },
            { value: '3-months', label: 'Within 3 months' },
            { value: '6-months', label: 'Within 6 months' },
            { value: '1-year', label: 'Within 1 year' },
            { value: 'exploring', label: 'Just exploring options' }
          ]
        },
        { 
          name: 'experience', 
          label: 'Real Estate Experience', 
          type: 'select', 
          required: true,
          options: [
            { value: '', label: 'Select your experience level' },
            { value: 'beginner', label: 'First-time investor' },
            { value: 'some-experience', label: 'Some experience (1-3 properties)' },
            { value: 'experienced', label: 'Experienced (4+ properties)' },
            { value: 'professional', label: 'Real estate professional' }
          ]
        }
      ]
    },
    {
      title: "Market Preferences",
      subtitle: "Where would you like to invest?",
      fields: [
        { 
          name: 'riskTolerance', 
          label: 'Risk Tolerance', 
          type: 'select', 
          required: true,
          options: [
            { value: '', label: 'Select your risk tolerance' },
            { value: 'conservative', label: 'Conservative (stable, lower returns)' },
            { value: 'moderate', label: 'Moderate (balanced risk/return)' },
            { value: 'aggressive', label: 'Aggressive (higher risk, higher returns)' },
            { value: 'very-aggressive', label: 'Very aggressive (maximum returns)' }
          ]
        }
      ]
    }
  ]

  const handleInputChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const validateCurrentStep = () => {
    const currentStepData = steps[currentStep]
    const requiredFields = currentStepData.fields.filter(field => field.required)
    
    return requiredFields.every(field => {
      const value = formData[field.name]
      return value && value.trim() !== ''
    })
  }

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1)
      } else {
        onComplete(formData)
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const isValid = validateCurrentStep()
  const currentStepData = steps[currentStep]

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-container glass">
        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
          <div className="progress-text">
            Step {currentStep + 1} of {steps.length}
          </div>
        </div>

        {/* Step Content */}
        <div className="step-content">
          <div className="step-header">
            <h2 className="step-title gradient-text">{currentStepData.title}</h2>
            <p className="step-subtitle">{currentStepData.subtitle}</p>
          </div>

          <div className="step-fields">
            {currentStepData.fields.map((field) => (
              <div key={field.name} className="field-group">
                <label className="field-label">
                  {field.label} {field.required && <span className="required">*</span>}
                </label>
                
                {field.type === 'select' ? (
                  <select
                    className="input-field"
                    value={formData[field.name]}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    required={field.required}
                  >
                    {field.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    className="input-field"
                    placeholder={field.placeholder}
                    value={formData[field.name]}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    required={field.required}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="navigation-buttons">
          {currentStep > 0 && (
            <button 
              className="btn-secondary"
              onClick={handleBack}
            >
              Back
            </button>
          )}
          
          <button 
            className={`btn-primary ${!isValid ? 'disabled' : ''}`}
            onClick={handleNext}
            disabled={!isValid}
          >
            {currentStep === steps.length - 1 ? 'Complete Setup' : 'Continue'}
          </button>
        </div>

        {/* Step Indicators */}
        <div className="step-indicators">
          {steps.map((_, index) => (
            <div 
              key={index} 
              className={`step-indicator ${index <= currentStep ? 'active' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default OnboardingFlow
