// Catalogo dei tile con la loro solidità, usato se data/art/tiles.json non li definisce ancora.

const WALK = 'grass grass_alt flowers path sand pier court court_line door stone_door floor_wood floor_tile carpet mat chair plate plate_on stage';
const SOLID = `water foam tree palm cactus hedge rock fence bench lamp fountain_tl fountain_tr fountain_bl fountain_br sign
flowerpot umbrella boat net wall_white wall_ochre wall_pink window_white window_ochre window_pink roof_l roof roof_r
roof_eave_l roof_eave roof_eave_r stone sign_book sign_joystick sign_artichoke sign_needle sign_mug sign_nuraghe
wall_in wall_in_window void bookshelf table table_dnd arcade barrel counter sewing mannequin duck_basket set_panel bed
sofa fridge kitchen plant tv pedestal`;

export const FALLBACK_TILES = Object.fromEntries([
  ...WALK.split(/\s+/).map(n => [n, { solid: false }]),
  ...SOLID.split(/\s+/).map(n => [n, { solid: true }]),
]);
