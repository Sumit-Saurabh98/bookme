import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
/**
 * step 1 - initilize google identity service
 * step 2 -  this does not redirect
 * step 3 google will retun a id token via callback
 */

useEffect(()=>{
  /**
 * step 1 - initilize google identity service
 *        - this does not redirect
 *        - google will retun a id token via callback
 */
  if(window.google){
    window.google.accounts.id.initialize({
      client_id: process.env.VITE_APP_GOOGLE_CLIENT_ID,
      callback:handleGoogleResponse
    })
/**
 * step 2 - Render Google button
 *        - we render it in a hidden div
 *        - trigger it programeticaaly for full ui controll
 * 
 */

window.google.accounts.id.renderButton({
  document.getElementsById("google-gis-btn"),
  {
    theme:outline,
    size: large,
    width:300
  }
})

  }
}, [])

/**
 * step 3 - google send id token here after succesful login
 * 
 */

const handleGoogleResponse = async(response) =>{
  try {
    /**
 * step 4 - send id token to backend
 * backend will:-
 * verify token with google
 * create /link user
 * issue access token and refresh token
 * set refresh token cookie
 * 
 */

    await axios.post(
      "http://localhost:4001/api/v1/auth/google-auth",
      {idToken:response.credential},
      {withCredentials: true}
    )

    /**
 * step 5 - Backend session is ready
 * frontend just redirects
 * 
 */

    window.location.href = "/dashboard"

  } catch (error) {
    
  }
}

  return (
    <>
    </>
  )
}

export default App
