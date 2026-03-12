import React, { useState } from "react";
import logo from '../image/food.png';
import cartimg from '../image/cart.jpg';
import '../header/header.css';
import { useSelector } from "react-redux";
import { useHistory } from "react-router-dom";

function Header(){
    const { cartTotalQUantity } = useSelector((state) => state.cart);
    const [searchTerm, setSearchTerm] = useState('');
    const history = useHistory();

    function handleSearch() {
        if (searchTerm.trim() !== '') {
            history.push(`/search?query=${searchTerm}`);
        }
    }

    return (
        <div className="header">
            <img src={logo} className='logo' alt="Logo" />

            <div>
                <input 
                    type='text' 
                    className="search-input" 
                    placeholder="Search for food..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button onClick={handleSearch}>Search</button>
            </div>

            <div style={{ position: 'relative', width: '100px' }}>
                <button className="cart-button" onClick={() => history.push('/cart')}>
                    <img src={cartimg} alt="Cart" />
                </button>
                <span className="msg">{cartTotalQUantity}</span>
            </div>

            <button className="cart-button" onClick={() => history.push('/home')}>
                <p style={{ color: "white", marginTop: '12px' }}>Home</p>
            </button>
            <button className="cart-button" onClick={() => history.push('/profile')}>
                <p style={{ color: "white", marginTop: '12px' }}>Profile</p>
            </button>
            <button className="cart-button" onClick={() => history.push('/login')}>
                <p style={{ color: "white", marginTop: '12px' }}>Log out</p>
            </button>
        </div>
    );
}

export default Header;
