import React from 'react'
import { Link } from 'react-router'
import '../../style/footer.scss'

const Footer = () => {
    const year = new Date().getFullYear()

    return (
        <footer className='app-footer'>
            <div className='app-footer__inner'>

                <div className='app-footer__brand'>
                    <p className='app-footer__name'>HireReady <span>AI</span></p>
                    <p className='app-footer__tagline'>Prepare smarter. Practice confidently. Get interview-ready.</p>
                </div>

                <nav className='app-footer__links' aria-label='Footer navigation'>
                    <Link to='/'>Home</Link>
                    <a href='https://github.com/TufailMd' target='_blank' rel='noopener noreferrer'>GitHub</a>
                    <a href='https://linkedin.com/in/tufailmd' target='_blank' rel='noopener noreferrer'>LinkedIn</a>
                    <a href='mailto:jrtufailmd@gmail.com'>Contact</a>
                </nav>

            </div>
            <p className='app-footer__copy'>
                &copy; {year} HireReady AI. Built by Md Tufail.
            </p>
        </footer>
    )
}

export default Footer
