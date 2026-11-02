import React, { useState, useRef } from 'react'
import "../style/home.scss"
import { useInterview } from '../hooks/useInterview.js'
import { useNavigate } from 'react-router'
import Loader from '../../../components/common/Loader'

const MAX_JD_CHARS = 5000
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_EXT = ['.pdf', '.docx']

const Home = () => {

    const { loading, reportsLoaded, generateReport } = useInterview()
    const [jobDescription, setJobDescription] = useState("")
    const [selfDescription, setSelfDescription] = useState("")
    const [resumeFile, setResumeFile] = useState(null)
    const [dragging, setDragging] = useState(false)
    const [error, setError] = useState("")
    const resumeInputRef = useRef(null)

    const navigate = useNavigate()

    const validateAndSetFile = (file) => {
        if (!file) return
        const name = file.name.toLowerCase()
        if (!ALLOWED_EXT.some(ext => name.endsWith(ext))) {
            setError('Only PDF or DOCX files are allowed.')
            return
        }
        if (file.size > MAX_FILE_SIZE) {
            setError('Resume must be 5MB or smaller.')
            return
        }
        setError("")
        setResumeFile(file)
    }

    const handleFileChange = (e) => validateAndSetFile(e.target.files?.[0])

    const handleDrop = (e) => {
        e.preventDefault()
        setDragging(false)
        validateAndSetFile(e.dataTransfer.files?.[0])
    }

    const removeFile = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setResumeFile(null)
        if (resumeInputRef.current) resumeInputRef.current.value = ""
    }

    const handleGenerateReport = async () => {
        if (loading) return

        if (!jobDescription.trim()) {
            setError('Please paste the target job description.')
            return
        }
        if (!resumeFile && !selfDescription.trim()) {
            setError('Upload a resume or add a quick self-description.')
            return
        }

        setError("")
        try {
            const data = await generateReport({
                jobDescription: jobDescription.trim(),
                selfDescription: selfDescription.trim(),
                resumeFile
            })
            if (!data?._id) throw new Error('No report returned')
            navigate(`/interview/${data._id}`)
        } catch (err) {
            console.error(err)
            setError('Could not generate your interview plan. Please try again.')
        }
    }

    if (!reportsLoaded) {
        return <Loader message="Loading your interview plans..." variant="section" />
    }

    return (
        <div className='home-page'>

            {/* Page Header */}
            <header className='page-header'>
                <h1>Create Your Custom <span className='highlight'>Interview Plan</span></h1>
                <p>Let our AI analyze the job requirements and your unique profile to build a winning strategy.</p>
            </header>

            {/* Main Card */}
            <div className='interview-card'>
                <div className='interview-card__body'>

                    {/* Left Panel - Job Description */}
                    <div className='panel panel--left'>
                        <div className='panel__header'>
                            <span className='panel__icon'>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                            </span>
                            <h2>Target Job Description</h2>
                            <span className='badge badge--required'>Required</span>
                        </div>
                        <textarea
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            className='panel__textarea'
                            placeholder={`Paste the full job description here...\ne.g. 'Senior Frontend Engineer at Google requires proficiency in React, TypeScript, and large-scale system design...'`}
                            maxLength={MAX_JD_CHARS}
                            aria-label='Target job description'
                        />
                        <div className='char-counter'>{jobDescription.length} / {MAX_JD_CHARS} chars</div>
                    </div>

                    {/* Vertical Divider */}
                    <div className='panel-divider' />

                    {/* Right Panel - Profile */}
                    <div className='panel panel--right'>
                        <div className='panel__header'>
                            <span className='panel__icon'>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                            </span>
                            <h2>Your Profile</h2>
                        </div>

                        {/* Upload Resume */}
                        <div className='upload-section'>
                            <label className='section-label'>
                                Upload Resume
                                <span className='badge badge--best'>Best Results</span>
                            </label>
                            <label
                                className='dropzone'
                                htmlFor='resume'
                                style={dragging ? { borderColor: '#ff2d6f' } : undefined}
                                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={handleDrop}
                            >
                                <span className='dropzone__icon'>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>
                                </span>
                                {resumeFile ? (
                                    <>
                                        <p className='dropzone__title'>{resumeFile.name}</p>
                                        <p className='dropzone__subtitle'>
                                            {(resumeFile.size / 1024).toFixed(0)} KB &bull;{' '}
                                            <button type='button' onClick={removeFile} style={{ background: 'none', border: 0, color: 'inherit', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
                                                Remove
                                            </button>
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className='dropzone__title'>Click to upload or drag &amp; drop</p>
                                        <p className='dropzone__subtitle'>PDF or DOCX (Max 5MB)</p>
                                    </>
                                )}
                                <input
                                    ref={resumeInputRef}
                                    hidden
                                    type='file'
                                    id='resume'
                                    name='resume'
                                    accept='.pdf,.docx'
                                    onChange={handleFileChange}
                                />
                            </label>
                        </div>

                        {/* OR Divider */}
                        <div className='or-divider'><span>OR</span></div>

                        {/* Quick Self-Description */}
                        <div className='self-description'>
                            <label className='section-label' htmlFor='selfDescription'>Quick Self-Description</label>
                            <textarea
                                value={selfDescription}
                                onChange={(e) => setSelfDescription(e.target.value)}
                                id='selfDescription'
                                name='selfDescription'
                                className='panel__textarea panel__textarea--short'
                                placeholder="Briefly describe your experience, key skills, and years of experience if you don't have a resume handy..."
                            />
                        </div>

                        {/* Info Box */}
                        <div className='info-box'>
                            <span className='info-box__icon'>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" stroke="#1a1f27" strokeWidth="2" /><line x1="12" y1="16" x2="12.01" y2="16" stroke="#1a1f27" strokeWidth="2" /></svg>
                            </span>
                            <p>Either a <strong>Resume</strong> or a <strong>Self Description</strong> is required to generate a personalized plan.</p>
                        </div>
                    </div>
                </div>

                {/* Card Footer */}
                <div className='interview-card__footer'>
                    <span className='footer-info'>
                        {error
                            ? <span role='alert' style={{ color: '#ff6b81' }}>{error}</span>
                            : <>AI-Powered Strategy Generation &bull; Approx 30s</>}
                    </span>
                    <button
                        type="button"
                        onClick={handleGenerateReport}
                        className="generate-btn"
                        disabled={loading}
                        aria-busy={loading}
                    >
                        {loading
                            ? <Loader variant="inline" message="Generating..." />
                            : "Generate My Interview Strategy"}
                    </button>
                </div>
            </div>

        </div>
    )
}

export default Home;