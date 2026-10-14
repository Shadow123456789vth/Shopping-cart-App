import { useEffect, useState } from 'react';
import { listCategories } from '../services/productService';

let cache = null;

export default function useCategories() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let active = true;
    cache = cache || listCategories().catch((err) => {
      cache = null;
      throw err;
    });
    cache.then((c) => active && setCategories(c)).catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return categories;
}
