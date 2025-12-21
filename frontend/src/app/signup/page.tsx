'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, ArrowRight, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SignupData {
  name: string
  company: string
  whyUsingPlatform: string
  email: string
  password: string
  confirmPassword: string
}

const steps = [
  { id: 1, title: 'Your Name', field: 'name' as keyof SignupData },
  { id: 2, title: 'Company', field: 'company' as keyof SignupData },
  { id: 3, title: 'Why HR Copilot?', field: 'whyUsingPlatform' as keyof SignupData },
  { id: 4, title: 'Email', field: 'email' as keyof SignupData },
  { id: 5, title: 'Password', field: 'password' as keyof SignupData },
  { id: 6, title: 'Confirm Password', field: 'confirmPassword' as keyof SignupData },
]

export default function SignupPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<SignupData>({
    name: '',
    company: '',
    whyUsingPlatform: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signup, isAuthenticated } = useAuth()
  const router = useRouter()

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, router])

  const currentStepData = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1
  // Allow proceeding if field has content (or if it's the optional whyUsingPlatform field)
  const canProceed = currentStepData.field === 'whyUsingPlatform' 
    ? true // Optional field, can proceed even if empty
    : formData[currentStepData.field]?.trim().length > 0

  const handleNext = () => {
    if (!canProceed) return
    
    if (currentStepData.field === 'email') {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        setError('Please enter a valid email address')
        return
      }
    }
    
    if (currentStepData.field === 'password') {
      // Validate password length
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters')
        return
      }
    }
    
    if (currentStepData.field === 'confirmPassword') {
      // Validate password match
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match')
        return
      }
    }

    setError('')
    if (isLastStep) {
      handleSubmit()
    } else {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
      setError('')
    }
  }

  const handleSubmit = async () => {
    setError('')
    setLoading(true)

    try {
      await signup(
        formData.name,
        formData.company,
        formData.whyUsingPlatform,
        formData.email,
        formData.password,
        formData.confirmPassword
      )
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Failed to sign up. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      [currentStepData.field]: value,
    }))
    setError('')
  }

  const getInputPlaceholder = () => {
    switch (currentStepData.field) {
      case 'name':
        return 'John Doe'
      case 'company':
        return 'Acme Inc.'
      case 'whyUsingPlatform':
        return 'Tell us why you\'re excited to use HR Copilot...'
      case 'email':
        return 'you@example.com'
      case 'password':
        return '••••••••'
      case 'confirmPassword':
        return '••••••••'
      default:
        return ''
    }
  }

  const getInputLabel = () => {
    switch (currentStepData.field) {
      case 'name':
        return 'What\'s your full name?'
      case 'company':
        return 'What company do you work for?'
      case 'whyUsingPlatform':
        return 'What brings you to HR Copilot?'
      case 'email':
        return 'What\'s your email address?'
      case 'password':
        return 'Create a secure password'
      case 'confirmPassword':
        return 'Confirm your password'
      default:
        return ''
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">HR Copilot</span>
          </Link>
          <div className="flex items-center justify-center gap-2 mb-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  'flex items-center',
                  index !== steps.length - 1 && 'flex-1'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300',
                    index < currentStep
                      ? 'bg-green-500 text-white'
                      : index === currentStep
                      ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white scale-110 shadow-lg'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {index < currentStep ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    step.id
                  )}
                </div>
                {index !== steps.length - 1 && (
                  <div
                    className={cn(
                      'h-1 flex-1 mx-2 rounded transition-all duration-300',
                      index < currentStep ? 'bg-green-500' : 'bg-muted'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl">
          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-destructive/10 text-destructive text-sm p-4 rounded-lg border border-destructive/20 animate-in slide-in-from-top-2">
              {error}
            </div>
          )}

          {/* Step Content */}
          <div className="space-y-6 min-h-[300px] flex flex-col">
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {currentStepData.title}
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                {getInputLabel()}
              </p>

              <div className="space-y-4">
                {currentStepData.field === 'whyUsingPlatform' ? (
                  <Textarea
                    value={formData.whyUsingPlatform}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder={getInputPlaceholder()}
                    className="min-h-[120px] text-lg"
                    disabled={loading}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        handleNext()
                      }
                    }}
                  />
                ) : (
                  <Input
                    type={
                      currentStepData.field === 'password' ||
                      currentStepData.field === 'confirmPassword'
                        ? 'password'
                        : currentStepData.field === 'email'
                        ? 'email'
                        : 'text'
                    }
                    value={formData[currentStepData.field] as string}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder={getInputPlaceholder()}
                    className="text-lg h-14"
                    disabled={loading}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && canProceed) {
                        handleNext()
                      }
                    }}
                    autoFocus
                  />
                )}

                {currentStepData.field === 'password' && (
                  <p className="text-xs text-muted-foreground">
                    Must be at least 6 characters
                  </p>
                )}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                disabled={currentStep === 0 || loading}
                className="flex items-center gap-2"
              >
                Back
              </Button>

              <Button
                type="button"
                onClick={handleNext}
                disabled={!canProceed || loading}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 min-w-[120px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : isLastStep ? (
                  <>
                    Sign Up
                    <Check className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">Already have an account? </span>
          <Link href="/login" className="text-purple-600 hover:text-purple-700 font-medium">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
