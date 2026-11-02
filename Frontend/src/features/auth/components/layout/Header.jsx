import React, { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router'
import { useAuth } from '../../hooks/useAuth'
import '../../style/header.scss'
import Loader from '../../../../components/common/Loader'

const API_URL = import.meta.env.VITE_API_URL;

const Header = () => {
    const [menuOpen, setMenuOpen] = useState(false)
    const [loggingOut, setLoggingOut] = useState(false)
    const navigate = useNavigate()

    // Works whether or not your useAuth exposes `user` / `handleLogout`
    const { user, handleLogout } = useAuth() ?? {}
    const username = user?.username || user?.name || ''
    const initial = username ? username.charAt(0).toUpperCase() : 'U'

    const closeMenu = () => setMenuOpen(false)

    const onLogout = async () => {
        try {
            setLoggingOut(true)
            if (typeof handleLogout === 'function') {
                await handleLogout()
            } else {
                await fetch(`${API_URL}/api/auth/logout`, { credentials: 'include' })
            }
        } catch (err) {
            console.error('Logout failed', err)
        } finally {
            setLoggingOut(false)
            closeMenu()
            navigate('/login')
        }
    }

    const linkClass = ({ isActive }) =>
        `app-header__link ${isActive ? 'app-header__link--active' : ''}`

    return (
        <header className='app-header'>
            <div className='app-header__inner'>

                <Link to='/' className='app-header__brand' onClick={closeMenu} aria-label='HireReady AI home'>
                    <span className='app-header__logo' aria-hidden='true'>
                        <svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'><circle cx='12' cy='12' r='10' /><circle cx='12' cy='12' r='6' /><circle cx='12' cy='12' r='2' /></svg>
                    </span>
                    <span className='app-header__name'>HireReady <span className='app-header__ai'>AI</span></span>
                </Link>

                <button
                    type='button'
                    className='app-header__toggle'
                    aria-label='Toggle menu'
                    aria-expanded={menuOpen}
                    aria-controls='app-header-menu'
                    onClick={() => setMenuOpen(o => !o)}
                >
                    {menuOpen ? (
                        <svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'><line x1='18' y1='6' x2='6' y2='18' /><line x1='6' y1='6' x2='18' y2='18' /></svg>
                    ) : (
                        <svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'><line x1='3' y1='6' x2='21' y2='6' /><line x1='3' y1='12' x2='21' y2='12' /><line x1='3' y1='18' x2='21' y2='18' /></svg>
                    )}
                </button>

                <div id='app-header-menu' className={`app-header__menu ${menuOpen ? 'app-header__menu--open' : ''}`}>
                    <nav className='app-header__nav' aria-label='Main navigation'>
                        <NavLink to='/my-plans' end className={linkClass} onClick={closeMenu}>My Plans</NavLink>
                    </nav>

                    <div className='app-header__user'>
                        <span className='app-header__avatar' aria-hidden='true'>{initial}</span>
                        {username && <span className='app-header__username'>{username}</span>}
                        <button
                            type='button'
                            className='app-header__logout'
                            onClick={onLogout}
                            disabled={loggingOut}
                        >
                            {loggingOut
                                ? <Loader variant='inline' message='Logging out...' />
                                : 'Logout'}
                        </button>
                    </div>
                </div>
            </div>
        </header>
    )
}

export default Header
