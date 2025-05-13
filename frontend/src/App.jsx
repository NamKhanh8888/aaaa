import { useEffect } from 'react';
import { Container } from 'react-bootstrap';
import { Outlet } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import { initSocket } from './services/socketService';

const App = () => {
  useEffect(() => {
    // Initialize socket connection
    initSocket();
  }, []);

  return (
    <>
      <Header />
      <main className='py-3'>
        <Container>
          <Outlet />
        </Container>
      </main>
      <Footer />
    </>
  );
};

export default App; 