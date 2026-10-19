// Use the host's bundled icon family for small controls. Weapon art, gauges
// and authored currency/custom images have their own rendering paths.
const icons=Object.freeze({book:'book-open',copy:'copy',lock:'lock',check:'check',info:'circle-info',train:'dumbbell',hp:'heart',mp:'wand-sparkles',stamina:'bolt',intelligence:'book-open',strength:'dumbbell',defense:'shield-halved',agility:'wind',hunger:'utensils',thirst:'droplet',chevron:'chevron-right',pin:'location-dot',transfer:'money-bill-transfer',names:'address-book',user:'user',search:'magnifying-glass',coins:'coins',settings:'gear',windows:'table-cells-large',close:'xmark'});
export function composerIcon(name){return `<i class="rf-composer-icon fa-solid fa-${Object.hasOwn(icons,name)?icons[name]:icons.book}" aria-hidden="true"></i>`;}
