import React from 'react'
import { Outlet } from 'react-router'
import Header from './Header'
import Footer from './Footer'
import '../../style/layout.scss'

const Layout = () => (
    <div className='app-shell'>
        <Header />
        <div className='app-main'>
            <Outlet />
        </div>
        <Footer />
    </div>
)

export default Layout
