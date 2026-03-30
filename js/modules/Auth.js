export function cerrarSesion() {

  localStorage.removeItem('token');
  localStorage.removeItem('rolUsuario');
  localStorage.removeItem('nombreUsuario');
  // Si agregaste el "filtro" al storage, borralo acá también
  localStorage.removeItem('filtroUsuario'); 
  

  window.location.href = "index.html"; 


}