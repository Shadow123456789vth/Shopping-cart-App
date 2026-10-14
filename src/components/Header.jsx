import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AppBar, Badge, Box, Button, Divider, IconButton, InputBase, ListItemIcon, Menu, MenuItem, Paper, Select, Toolbar, Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import useCategories from '../hooks/useCategories';
import Logo from './Logo';

const navText = { color: '#fff', lineHeight: 1.1, textAlign: 'left', px: 1, py: 0.5, borderRadius: 1, border: '1px solid transparent', '&:hover': { borderColor: '#fff' } };

export default function Header() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const categories = useCategories();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') || '');
  const [category, setCategory] = useState(params.get('category') || '');
  const [anchor, setAnchor] = useState(null);

  useEffect(() => {
    setSearch(params.get('q') || '');
    setCategory(params.get('category') || '');
  }, [params]);

  const goSearch = (q, cat) => {
    const next = new URLSearchParams();
    if (q?.trim()) next.set('q', q.trim());
    if (cat) next.set('category', cat);
    navigate({ pathname: '/', search: next.toString() });
  };

  const handleSignOut = () => {
    setAnchor(null);
    logout();
    navigate('/login');
  };

  return (
    <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'nav.main' }}>
      <Toolbar sx={{ gap: { xs: 1, md: 2 }, flexWrap: { xs: 'wrap', md: 'nowrap' }, py: { xs: 1, md: 0 } }}>
        <Box component={RouterLink} to="/" sx={{ ...navText, textDecoration: 'none', py: 1 }}>
          <Logo />
        </Box>

        <Paper
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            goSearch(search, category);
          }}
          sx={{ display: 'flex', flex: 1, order: { xs: 3, md: 0 }, flexBasis: { xs: '100%', md: 'auto' }, overflow: 'hidden', borderRadius: 1.5, height: 40 }}
        >
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            displayEmpty
            variant="standard"
            disableUnderline
            sx={{ display: { xs: 'none', sm: 'flex' }, bgcolor: '#E6E6E6', px: 1.5, fontSize: 13, minWidth: 70, maxWidth: 160 }}
          >
            <MenuItem value="">All</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </Select>
          <InputBase
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ShopNow"
            sx={{ flex: 1, px: 1.5 }}
            inputProps={{ 'aria-label': 'Search products' }}
          />
          <IconButton type="submit" aria-label="Search" sx={{ bgcolor: 'nav.accent', borderRadius: 0, px: 1.5, '&:hover': { bgcolor: '#F3A847' } }}>
            <SearchIcon sx={{ color: '#333' }} />
          </IconButton>
        </Paper>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
          <Button onClick={(e) => setAnchor(e.currentTarget)} sx={{ ...navText, borderRadius: 1, display: 'block' }}>
            <Typography variant="caption" component="div">Hello, {user?.firstName}</Typography>
            <Typography variant="body2" component="div" fontWeight={700} sx={{ display: 'flex', alignItems: 'center' }}>
              Account <ExpandMoreIcon fontSize="small" />
            </Typography>
          </Button>
          <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
            <Box sx={{ px: 2, py: 1 }}>
              <Typography fontWeight={700}>{user?.name}</Typography>
              <Typography variant="body2" color="text.secondary">{user?.email || user?.userName}</Typography>
            </Box>
            <Divider />
            <MenuItem onClick={() => { setAnchor(null); navigate('/orders'); }}>
              <ListItemIcon><ReceiptLongOutlinedIcon fontSize="small" /></ListItemIcon>
              Your Orders
            </MenuItem>
            <MenuItem onClick={handleSignOut}>
              <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
              Sign out
            </MenuItem>
          </Menu>

          <Button component={RouterLink} to="/orders" sx={{ ...navText, borderRadius: 1, display: { xs: 'none', md: 'block' } }}>
            <Typography variant="caption" component="div">Returns</Typography>
            <Typography variant="body2" component="div" fontWeight={700}>&amp; Orders</Typography>
          </Button>

          <Button component={RouterLink} to="/cart" sx={{ ...navText, borderRadius: 1, display: 'flex', alignItems: 'flex-end', gap: 0.5 }} aria-label={`Cart, ${count} items`}>
            <Badge badgeContent={count} color="warning" max={99} showZero>
              <ShoppingCartOutlinedIcon sx={{ fontSize: 32 }} />
            </Badge>
            <Typography variant="body2" fontWeight={700} sx={{ display: { xs: 'none', sm: 'block' } }}>Cart</Typography>
          </Button>
        </Box>
      </Toolbar>

      <Box sx={{ bgcolor: 'nav.light', px: 2, display: 'flex', gap: 0.5, overflowX: 'auto', whiteSpace: 'nowrap' }}>
        <Button size="small" startIcon={<MenuIcon />} onClick={() => goSearch('', '')} sx={{ ...navText, borderRadius: 1, fontWeight: 700 }}>
          All
        </Button>
        {categories.map((c) => (
          <Button key={c.id} size="small" onClick={() => goSearch('', c.id)} sx={{ ...navText, borderRadius: 1 }}>
            {c.name}
          </Button>
        ))}
      </Box>
    </AppBar>
  );
}
