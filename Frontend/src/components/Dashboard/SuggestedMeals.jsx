// src/components/Dashboard/SuggestedMeals.jsx
//
// Shows recipe suggestions based on the items currently in the user's Food
// Inventory (e.g. if they have "Tomato", it suggests dishes made with tomato).
//
// Data source: TheMealDB (https://www.themealdb.com/api.php) — a free, public
// recipe API that requires NO signup and NO API key. It uses a shared "test"
// key of `1` in the URL, which TheMealDB publishes for exactly this kind of
// use. Filtering meals by a single ingredient is fully free; only
// multi-ingredient filtering requires their paid tier, so here we query one
// ingredient at a time (per food-inventory item) and merge/dedupe the
// results on the client.
import { useEffect, useMemo, useState } from 'react';
import { ChevronsLeft, ChevronsRight, X, ExternalLink } from 'lucide-react';
import { colors, fonts, btnOutlineStyle } from '../../theme';
import { foodApi } from '../../services/api';

const MEALDB_BASE = 'https://www.themealdb.com/api/json/v1/1';
const PAGE_SIZE = 5;
const MAX_INGREDIENTS_TO_QUERY = 6; // keep it light — one request per ingredient
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop';

// Very small heuristic to also try the singular form of a plural ingredient
// name (TheMealDB's ingredient names are usually singular, e.g. "Tomato").
function singularize(word) {
  if (word.endsWith('oes')) return word.slice(0, -2); // tomatoes -> tomato
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`; // berries -> berry
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

async function fetchMealsForIngredient(ingredient) {
  const tryFetch = async (term) => {
    const res = await fetch(`${MEALDB_BASE}/filter.php?i=${encodeURIComponent(term)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.meals) ? data.meals : [];
  };

  let meals = await tryFetch(ingredient);
  if (meals.length === 0) {
    const singular = singularize(ingredient);
    if (singular.toLowerCase() !== ingredient.toLowerCase()) {
      meals = await tryFetch(singular);
    }
  }
  return meals.map((m) => ({
    id: m.idMeal,
    name: m.strMeal,
    image: m.strMealThumb,
    matchedIngredient: ingredient,
  }));
}

async function fetchRandomMeals(count) {
  const results = [];
  for (let i = 0; i < count; i++) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await fetch(`${MEALDB_BASE}/random.php`);
      // eslint-disable-next-line no-await-in-loop
      const data = await res.json();
      const meal = data.meals?.[0];
      if (meal) {
        results.push({ id: meal.idMeal, name: meal.strMeal, image: meal.strMealThumb, matchedIngredient: null });
      }
    } catch {
      // ignore individual failures
    }
  }
  return results;
}

async function fetchMealDetail(id) {
  const res = await fetch(`${MEALDB_BASE}/lookup.php?i=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Failed to load recipe.');
  const data = await res.json();
  const meal = data.meals?.[0];
  if (!meal) throw new Error('Recipe not found.');

  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const name = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (name && name.trim()) {
      ingredients.push({ name: name.trim(), measure: measure ? measure.trim() : '' });
    }
  }

  return {
    id: meal.idMeal,
    name: meal.strMeal,
    image: meal.strMealThumb,
    category: meal.strCategory,
    area: meal.strArea,
    instructions: meal.strInstructions,
    youtube: meal.strYoutube,
    source: meal.strSource,
    ingredients,
  };
}

export default function SuggestedMeals() {
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [usingFallback, setUsingFallback] = useState(false);
  const [page, setPage] = useState(1);

  const [activeRecipeId, setActiveRecipeId] = useState(null);
  const [recipeDetail, setRecipeDetail] = useState(null);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeErr, setRecipeErr] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErrMsg('');
      setUsingFallback(false);

      try {
        const items = await foodApi.getAll();
        const names = Array.from(
          new Set(
            (Array.isArray(items) ? items : [])
              .map((it) => (it.name || '').trim())
              .filter(Boolean)
          )
        ).slice(0, MAX_INGREDIENTS_TO_QUERY);

        let merged = [];
        if (names.length > 0) {
          const results = await Promise.all(names.map((n) => fetchMealsForIngredient(n)));
          const byId = new Map();
          results.flat().forEach((meal) => {
            if (!byId.has(meal.id)) byId.set(meal.id, meal);
          });
          merged = Array.from(byId.values());
        }

        if (cancelled) return;

        if (merged.length === 0) {
          // No inventory yet, or none of the ingredient names matched TheMealDB —
          // still show something useful instead of an empty page.
          const fallback = await fetchRandomMeals(6);
          if (cancelled) return;
          setSuggestions(fallback);
          setUsingFallback(true);
        } else {
          setSuggestions(merged);
        }
      } catch (err) {
        if (!cancelled) setErrMsg(err.message || 'Failed to load meal suggestions.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const totalPages = Math.max(1, Math.ceil(suggestions.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => suggestions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [suggestions, currentPage]
  );

  const openRecipe = async (id) => {
    setActiveRecipeId(id);
    setRecipeDetail(null);
    setRecipeErr('');
    setRecipeLoading(true);
    try {
      const detail = await fetchMealDetail(id);
      setRecipeDetail(detail);
    } catch (err) {
      setRecipeErr(err.message || 'Failed to load recipe.');
    } finally {
      setRecipeLoading(false);
    }
  };

  const closeRecipe = () => {
    setActiveRecipeId(null);
    setRecipeDetail(null);
    setRecipeErr('');
  };

  return (
    <div className="mb-4">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h5 style={{ fontFamily: fonts.display, fontWeight: 700, color: colors.charcoal, margin: 0, borderBottom: `2px solid ${colors.charcoal}`, display: 'inline-block', paddingBottom: 2 }}>
          Suggested Meal
        </h5>
        {totalPages > 1 && (
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-sm p-1"
              style={{ color: currentPage === 1 ? colors.border : colors.charcoal, background: 'none', border: 'none' }}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="Previous"
            >
              <ChevronsLeft size={18} />
            </button>
            <span className="fw-semibold" style={{ color: colors.charcoal, fontSize: '0.85rem' }}>{currentPage}</span>
            <button
              type="button"
              className="btn btn-sm p-1"
              style={{ color: currentPage === totalPages ? colors.border : colors.charcoal, background: 'none', border: 'none' }}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="Next"
            >
              <ChevronsRight size={18} />
            </button>
          </div>
        )}
      </div>

      {usingFallback && !loading && (
        <p className="mb-2" style={{ fontSize: '0.78rem', color: colors.muted }}>
          Add items to your Food Inventory to get suggestions tailored to what you have on hand. Showing general ideas for now.
        </p>
      )}

      <div className="rounded-4 p-3" style={{ background: '#fbfaf4', border: `1px solid ${colors.border}` }}>
        {loading ? (
          <div className="text-center py-4" style={{ color: colors.muted, fontSize: '0.9rem' }}>Finding recipe ideas…</div>
        ) : errMsg ? (
          <div className="alert alert-danger py-2 small mb-0">{errMsg}</div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-4" style={{ color: colors.muted, fontSize: '0.9rem' }}>
            No suggestions available right now.
          </div>
        ) : (
          <div className="d-flex gap-3 flex-wrap flex-md-nowrap" style={{ overflowX: 'auto' }}>
            {paginated.map((meal) => (
              <div
                key={meal.id}
                className="rounded-4 p-2 flex-shrink-0 text-center"
                style={{ background: '#eef2e3', border: `1px solid ${colors.authGreen}`, width: 150 }}
              >
                <img
                  src={meal.image || FALLBACK_IMAGE}
                  alt={meal.name}
                  className="rounded-3 w-100"
                  style={{ height: 96, objectFit: 'cover' }}
                  onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                />
                <div
                  className="fw-bold mt-2 mb-1"
                  style={{ fontSize: '0.82rem', color: colors.charcoal, lineHeight: 1.25, minHeight: '2.2em' }}
                  title={meal.name}
                >
                  {meal.name}
                </div>
                {meal.matchedIngredient && (
                  <div className="mb-1" style={{ fontSize: '0.68rem', color: colors.muted }}>
                    Uses: {meal.matchedIngredient}
                  </div>
                )}
                <button
                  type="button"
                  className="btn btn-sm w-100"
                  style={{ ...btnOutlineStyle, borderColor: colors.authGreen, color: colors.authGreen, fontSize: '0.75rem', padding: '0.25rem 0' }}
                  onClick={() => openRecipe(meal.id)}
                >
                  View Recipe
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeRecipeId && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ background: 'rgba(0,0,0,0.45)', zIndex: 1060 }}
          onClick={closeRecipe}
        >
          <div
            className="rounded-4 p-4"
            style={{ background: '#fbfaf1', border: `1px solid ${colors.border}`, maxWidth: 560, width: '92%', maxHeight: '85vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-start mb-3">
              <h4 style={{ fontFamily: fonts.display, color: colors.charcoal, margin: 0 }}>
                {recipeDetail?.name || 'Recipe'}
              </h4>
              <button
                type="button"
                className="btn btn-sm p-1"
                style={{ background: 'none', border: 'none', color: colors.muted }}
                onClick={closeRecipe}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {recipeLoading ? (
              <div className="text-center py-4" style={{ color: colors.muted }}>Loading recipe…</div>
            ) : recipeErr ? (
              <div className="alert alert-danger py-2 small mb-0">{recipeErr}</div>
            ) : recipeDetail && (
              <>
                <img
                  src={recipeDetail.image || FALLBACK_IMAGE}
                  alt={recipeDetail.name}
                  className="rounded-3 w-100 mb-3"
                  style={{ height: 200, objectFit: 'cover' }}
                  onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                />
                <div className="mb-3 small" style={{ color: colors.muted }}>
                  {[recipeDetail.category, recipeDetail.area].filter(Boolean).join(' • ')}
                </div>

                <h6 style={{ fontWeight: 700, color: colors.charcoal }}>Ingredients</h6>
                <ul className="mb-3" style={{ fontSize: '0.88rem', color: colors.charcoal, paddingLeft: '1.1rem' }}>
                  {recipeDetail.ingredients.map((ing, i) => (
                    <li key={i}>{ing.measure ? `${ing.measure} ` : ''}{ing.name}</li>
                  ))}
                </ul>

                <h6 style={{ fontWeight: 700, color: colors.charcoal }}>Instructions</h6>
                <p style={{ fontSize: '0.88rem', color: colors.charcoal, whiteSpace: 'pre-line' }}>
                  {recipeDetail.instructions}
                </p>

                <div className="d-flex gap-3 mt-3">
                  {recipeDetail.source && (
                    <a href={recipeDetail.source} target="_blank" rel="noreferrer" className="small d-inline-flex align-items-center gap-1" style={{ color: colors.authGreen }}>
                      Source <ExternalLink size={13} />
                    </a>
                  )}
                  {recipeDetail.youtube && (
                    <a href={recipeDetail.youtube} target="_blank" rel="noreferrer" className="small d-inline-flex align-items-center gap-1" style={{ color: colors.authGreen }}>
                      Video <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}