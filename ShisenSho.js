class Tile {
	static WIDTH = 50;
	static HEIGHT = 75;
	
	static MARGIN = 5;
	
	static sourceForID = [
		"Bamboo-1.png",
		"Bamboo-2.png",
		"Bamboo-3.png",
		"Bamboo-4.png",
		"Bamboo-5.png",
		"Bamboo-6.png",
		"Bamboo-7.png",
		"Bamboo-8.png",
		"Bamboo-9.png",
		"Circle-1.png",
		"Circle-2.png",
		"Circle-3.png",
		"Circle-4.png",
		"Circle-5.png",
		"Circle-6.png",
		"Circle-7.png",
		"Circle-8.png",
		"Circle-9.png",
		"Number-1.png",
		"Number-2.png",
		"Number-3.png",
		"Number-4.png",
		"Number-5.png",
		"Number-6.png",
		"Number-7.png",
		"Number-8.png",
		"Number-9.png",
		"Dragon-Blank.png",
		"Dragon-Green.png",
		"Dragon-Red.png",
		//"Flower-Bamboo.png",
		"Flower-Chrysanthemum.png",
		//"Flower-Orchid.png",
		//"Flower-Plum.png",
		"Season-Autumn.png",
		//"Season-Spring.png",
		//"Season-Summer.png",
		//"Season-Winter.png",
		"Wind-East.png",
		"Wind-North.png",
		"Wind-South.png",
		"Wind-West.png",
	];
	
	highlighted = false;
	hinted = false;
	id = 0;
	fadeoutBegan = false;
	element = null;
	
	x;
	y;
	
	game;
	
	constructor(game, id, parentElement, clickHandler) {
		this.game = game;
		this.id = id;
		this.element = document.createElement('img');
		this.element.style.backgroundImage = `url(tiles/${Tile.sourceForID[id]})`;
		this.element.className = 'tile';
		this.element.style.height = `${Tile.HEIGHT}px`;
		this.element.style.width = `${Tile.WIDTH}px`;
		this.element.addEventListener('click', (event) => {
			game.cell_click(this.x, this.y);
		});
		parentElement.appendChild(this.element);
	}
	
	beginFadeout() {
		this.fadeoutBegan = true;
		this.element.style.transition = 'opacity 0.5s ease-out'; // Apply transition effect
		this.element.style.opacity = '0'; // Set final opacity to trigger fade-out
		
		// Remove the element from the DOM after the transition ends
		this.element.addEventListener('transitionend', () => this.element.remove());
	}
	
	setHighlighted(newValue) {
		this.highlighted = newValue;
		if (newValue) {
			this.element.classList.add('highlighted');
		} else {
			this.element.classList.remove('highlighted');
		}
	}
	
	setHinted(newValue) {
		this.hinted = newValue;
		if (newValue) {
			this.element.classList.add('hinted');
		} else {
			this.element.classList.remove('hinted');
		}
	}
	
	reposition(x, y) {
		[this.x, this.y] = [x, y];
		this.element.style.top = `${y * (Tile.HEIGHT+Tile.MARGIN)}px`;
		this.element.style.left = `${x * (Tile.WIDTH+Tile.MARGIN)}px`;
	}
}

class ShisenSho {
	static WIN_CAPTION = "Victory!";
	static LOSE_CAPTION = "Defeated!\n(No more moves)";
	
	static HELP_BASIC =
		"Connect matching tiles. The path between them must not go over other tiles,  and must have no more than three segments.";
	
	static NO_MORE_ZAPS_THIS_GAME = "No more zaps this game";
	static NO_MORE_CHEATS_THIS_GAME = "No more cheats this game";
	static TILES_DO_NOT_MATCH = "Tiles do not match";
	static NO_ROUTE_BETWEEN_THOSE_TILES = "No route between those tiles";
	static CLICK_THE_FLASHING_TILES = "Click the flashing tiles";
	static NO_MOVES_REMAINING_TRY_ZAPPING_OR_CHEATING = "No moves remaining, try zapping or cheating.";
	static NO_MORE_HINTS_THIS_GAME = "No more hints this game";
	
	static HELP_CHEAT = "Connect tiles anywhere, or click 'Cheat' again to cancel.";
	
	cells = [];
	remaining_hints = 0;
	remaining_cheats = 0
	remaining_zaps = 0;
	magic_connect = false;
	path = [];
	magic_path = [];
	path_opacity = 0;
	
	selected_cell;
	initial_matching_pair_count = 0;
	
	hintButton = null;
	zapButton = null;
	magicWandButton = null;
	
	remainingCountLabel = null;
	
	messagesLabel = null;
	
	overlayCanvas = null;
	gameOverContainer = null;
	gameOverMessage = null;
	
	static DIFFICULTY_EASY = 0;
	static DIFFICULTY_MEDIUM = 1;
	static DIFFICULTY_HARD = 2;
	
	static GRID_WIDTH = 18+2;
	static GRID_HEIGHT = 8+2;
	static NORTH = 1;
	static EAST = 2;
	static SOUTH = 3;
	static WEST = 4;
	
	constructor(difficulty, gameContainerElement) {
		const displayWidth = (Tile.WIDTH+Tile.MARGIN) * ShisenSho.GRID_WIDTH;
		const displayHeight = (Tile.HEIGHT+Tile.MARGIN) * ShisenSho.GRID_HEIGHT;
		gameContainerElement.style.height = `${displayHeight}px`;
		gameContainerElement.style.width = `${displayWidth}px`;
		
		var MIN_MATCHING_PAIRS = 0;
		var MAX_MATCHING_PAIRS = 144;
		switch (difficulty) {
		case ShisenSho.DIFFICULTY_EASY:
			this.remaining_hints = this.remaining_cheats = this.remaining_zaps = 8;
			MIN_MATCHING_PAIRS = 12;
			MAX_MATCHING_PAIRS = 144;
			break;
		case ShisenSho.DIFFICULTY_HARD:
			this.remaining_hints = this.remaining_cheats = this.remaining_zaps = 0;
			MIN_MATCHING_PAIRS = 2;
			MAX_MATCHING_PAIRS = 10;
			break;
		default: // Anything not recognised is assumed to be ShisenSho.DIFFICULTY_MEDIUM:
			this.remaining_hints = this.remaining_cheats = this.remaining_zaps = 2;
			MIN_MATCHING_PAIRS = 9;
			MAX_MATCHING_PAIRS = 14;
			break;
		}
		this.cells = [];
		do {
			gameContainerElement.textContent = '';
			const MAX = (ShisenSho.GRID_WIDTH-2)*(ShisenSho.GRID_HEIGHT-2);
			var unshuffledTiles = new Array(MAX);
			for (let i=0; i<MAX; ++i) {
				unshuffledTiles[i] = new Tile(this, Math.floor(i / 4), gameContainerElement);
			}
			var shuffledTiles = unshuffledTiles
				.map(value => ({ value, sort: Math.random() }))
				.sort((a, b) => a.sort - b.sort)
				.map(({ value }) => value);
			for (let x=0; x<ShisenSho.GRID_WIDTH; ++x) {
				this.cells[x] = [];
				if (x!=0 && x!=ShisenSho.GRID_WIDTH-1) {
					// If-test so that JS doesn't leave things undefined
					for (let y=1; y<ShisenSho.GRID_HEIGHT-1; ++y) {
						this.cells[x][y] = shuffledTiles.pop();
					}
				}
			}
			this.initial_matching_pair_count = this.count_remaining_moves();
		} while (this.initial_matching_pair_count>MAX_MATCHING_PAIRS || this.initial_matching_pair_count<MIN_MATCHING_PAIRS);
		this.overlayCanvas = gameContainerElement.appendChild(document.createElement('canvas'));
		this.overlayCanvas.width = displayWidth;
		this.overlayCanvas.height = displayHeight;
		this.repositionAllTiles();
	}
	
	repositionAllTiles() {
		for (let x=1; x<ShisenSho.GRID_WIDTH-1; ++x) {
			for (let y=1; y<ShisenSho.GRID_HEIGHT-1; ++y) {
				this.cells[x][y].reposition(x, y);
			}
		}
	}
	
	updateUI() {
		this.hintButton.innerText = `Hints: ${this.remaining_hints}`;
		this.zapButton.innerText = `Zaps: ${this.remaining_zaps}`;
		this.magicWandButton.innerText = `Magic: ${this.remaining_cheats}`;
		this.remainingCountLabel.innerText = `Available moves: ${this.count_remaining_moves()}`;
		this.post_message(ShisenSho.HELP_BASIC);
	}
	
	post_message(message) {
		if (this.messagesLabel == null) {
			alert(message);
		} else {
			this.messagesLabel.innerText = message;
		}
	}
	
	configureMagicWandButton(element) {
		this.magicWandButton = element;
		this.magicWandButton.addEventListener('click', () => {
			this.cheat();
		});
	}
	
	cheat() {
		if (this.magic_connect) {
			this.remaining_cheats++;
			this.magic_connect = false;
		}
		else {
			if (this.remaining_cheats>0) {
				this.remaining_cheats--;
				this.magic_connect = true;
				this.post_message(ShisenSho.HELP_CHEAT);
			}
			else {
				this.post_message(ShisenSho.NO_MORE_CHEATS_THIS_GAME);
			}
		}
		
		this.updateUI();
	}
	
	randomInt(maxExclusive) {
		return Math.floor(Math.random() * maxExclusive);
	}
	
	configureZapButton(element) {
		this.zapButton = element;
		this.zapButton.addEventListener('click', () => {
			this.zap();
		});
	}
	zap() {
		if (this.remaining_zaps<=0) {
			this.post_message(ShisenSho.NO_MORE_ZAPS_THIS_GAME);
			return;
		}
		
		let x1, y1, x2, y2;
		
		if (this.count_remaining_tiles()>0) {
			this.remaining_zaps--;
			do {
				x1 = this.randomInt(ShisenSho.GRID_WIDTH);
				y1 = this.randomInt(ShisenSho.GRID_HEIGHT);
			} while (!this.cell_exists(x1, y1));
			for (x2=0; x2<ShisenSho.GRID_WIDTH; x2++) {
				for (y2=0; y2<ShisenSho.GRID_HEIGHT; y2++) {
					if (x1!=x2 || y1!=y2) {
						if (this.cell_exists(x2, y2) && this.cells[x1][y1].id == this.cells[x2][y2].id) {
							this.cells[x1][y1].beginFadeout();
							this.cells[x2][y2].beginFadeout();
							this.some_cells_removed(false);
							return;
						}
					}
				}
			}
		}
	}
	
	configureHintButton(element) {
		this.hintButton = element;
		this.hintButton.addEventListener('click', () => {
			this.hint();
		});
	}
	
	hint() {
		if (this.remaining_hints<=0) {
			this.post_message(ShisenSho.NO_MORE_HINTS_THIS_GAME);
			return;
		}
		
		let x1, y1, x2, y2;
		
		if (this.count_remaining_moves()==0) {
			this.post_message(ShisenSho.NO_MOVES_REMAINING_TRY_ZAPPING_OR_CHEATING);
		}
		else if (this.count_hinted_tiles() == 2) {
			this.post_message(ShisenSho.CLICK_THE_FLASHING_TILES);
		}
		else {
			this.clear_tile_hints();
			this.remaining_hints--;
			for (x1=0; x1<ShisenSho.GRID_WIDTH; x1++) { for (y1=0; y1<ShisenSho.GRID_HEIGHT; y1++) {
				if (this.cell_exists(x1, y1)) {
					var tile_1 = this.cells[x1][y1];
					for (x2=0; x2<ShisenSho.GRID_WIDTH; x2++) { for (y2=0; y2<ShisenSho.GRID_HEIGHT; y2++) {
						var tile_2 = this.cells[x2][y2];
						if (this.cell_exists(x2, y2) && tile_1.id==tile_2.id) {
							if (this.spider_search_wrapper(x1, y1, x2, y2)) {
								tile_1.setHinted(true);
								tile_2.setHinted(true);
								this.post_message(ShisenSho.CLICK_THE_FLASHING_TILES);
								this.updateUI();
								return;
							}
						}
					} }
				}
			} }
		}
	}
	
	clear_tile_hints() {
		for (let x1=0; x1<ShisenSho.GRID_WIDTH; x1++) {
			for (let y1=0; y1<ShisenSho.GRID_HEIGHT; y1++) {
				if (this.cell_exists(x1, y1)) {
					this.cells[x1][y1].setHinted(false);
				}
			}
		}
	}
	
	count_hinted_tiles() {
		var result = 0;
		for (let x1=0; x1<ShisenSho.GRID_WIDTH; x1++) {
			for (let y1=0; y1<ShisenSho.GRID_HEIGHT; y1++) {
				if (this.cell_exists(x1, y1) && this.cells[x1][y1].hinted) {
					result++;
				}
			}
		}
		return result;
	}
	
	cell_click(cel_column, cell_row) {
		if (cel_column>=0 && cell_row>=0 && cel_column<ShisenSho.GRID_WIDTH && cell_row<ShisenSho.GRID_HEIGHT) {
			if (this.cell_exists(cel_column, cell_row) && 1==this.selected_cell_count()) {
				if (this.cells[cel_column][cell_row] == this.selected_cell) {
					this.cells[cel_column][cell_row].setHighlighted( !this.cells[cel_column][cell_row].highlighted);
				}
				else {
					if (this.cells[cel_column][cell_row].id==this.selected_cell.id) {
						this.cells[cel_column][cell_row].setHighlighted(true);
						this.try_to_remove_cell_pair();
						if (this.cell_exists(cel_column, cell_row)) { // Remove failed
							this.cells[cel_column][cell_row].setHighlighted(false);
							this.post_message(ShisenSho.NO_ROUTE_BETWEEN_THOSE_TILES);
						}
					}
					else {
						this.post_message(ShisenSho.TILES_DO_NOT_MATCH);
					}
				}
			}
			else if (0==this.selected_cell_count() && this.cell_exists(cel_column, cell_row)) {
				this.selected_cell = this.cells[cel_column][cell_row];
				this.selected_cell.setHighlighted(true);
			}
		}
		else {
			// This means there was no cell at that location. Do nothing
		}
	}
	
	do_endgame_check() {
		if (this.count_remaining_tiles()==0) {
			this.win();
		}
		else if (0==this.count_remaining_moves() && 0==this.remaining_zaps && 0==this.remaining_cheats && !this.magic_connect) {
			this.lose();
		}
	}
	
	win() {
		this.showGameOverWithMessage(ShisenSho.WIN_CAPTION);
	}
	
	lose() {
		this.showGameOverWithMessage(ShisenSho.LOSE_CAPTION);
	}
	
	showGameOverWithMessage(message) {
		this.gameOverContainer.classList.add('visible');
		this.gameOverMessage.innerText = message;
	}
	
	count_remaining_moves() {
		let result = 0;
		
		for (let fromX=0; fromX<ShisenSho.GRID_WIDTH; ++fromX) {
			for (let fromY=0; fromY<ShisenSho.GRID_HEIGHT; ++fromY) {
				
				for (let toX=0; toX<ShisenSho.GRID_WIDTH; ++toX) {
					for (let toY=0; toY<ShisenSho.GRID_HEIGHT; ++toY) {
						
						if (	(fromX!=toX || fromY!=toY) &&
								this.cell_exists(fromX, fromY) && this.cell_exists(toX, toY) &&
								this.cells[fromX][fromY].id == this.cells[toX][toY].id) {
							if (this.spider_search_wrapper(fromX, fromY, toX, toY)) ++result;
						}
					}
				}
				
			}
		}
		
		return result/2; // Need to /2 because it counts a->b and b->a as unique
	}
	
	spider_search_wrapper(x1, y1, x2, y2) {
		let result = false;
		
		this.path = [];
		
		for (let remainingBends=1; remainingBends<=2 && !result; ++remainingBends) {
			result = 
				this.spider_search(x1, y1-1, x2, y2, ShisenSho.NORTH, remainingBends) ||
				this.spider_search(x1+1, y1, x2, y2, ShisenSho.EAST, remainingBends) ||
				this.spider_search(x1, y1+1, x2, y2, ShisenSho.SOUTH, remainingBends) ||
				this.spider_search(x1-1, y1, x2, y2, ShisenSho.WEST, remainingBends);
		}
		
		if (result) {
			this.path.push(x1);
			this.path.push(y1);
		}
		
		return result;
	}
	
	spider_search(fromX, fromY, toX, toY, direction, remainingBends) {
		let result = false;
		
		if ( remainingBends < 0 ) { // MUST NOT combine as the order of these three bits is important!
			return false;
		}
		else if  ( fromX==toX && fromY==toY ) {
			this.path.push(fromX);
			this.path.push(fromY);
			return true;
		}
		else {
			if ( fromX>=0 && fromY>=0 && fromX<ShisenSho.GRID_WIDTH && fromY<ShisenSho.GRID_HEIGHT ) {
				if ( this.cell_exists(fromX, fromY) ) return false;
			}
			else {
				return false;
			}
		}
		
		switch (direction) {
		case ShisenSho.NORTH:
			result = this.spider_search(fromX+1, fromY, toX, toY, ShisenSho.EAST, remainingBends-1) ||
					this.spider_search(fromX-1, fromY, toX, toY, ShisenSho.WEST, remainingBends-1) ||
					this.spider_search(fromX, fromY-1, toX, toY, ShisenSho.NORTH, remainingBends);
			break;
			
		case ShisenSho.EAST:
			result = this.spider_search(fromX, fromY-1, toX, toY, ShisenSho.NORTH, remainingBends-1) ||
					this.spider_search(fromX, fromY+1, toX, toY, ShisenSho.SOUTH, remainingBends-1) ||
					this.spider_search(fromX+1, fromY, toX, toY, ShisenSho.EAST, remainingBends);
			break;
			
		case ShisenSho.SOUTH:
			result = this.spider_search(fromX+1, fromY, toX, toY, ShisenSho.EAST, remainingBends-1) ||
					this.spider_search(fromX-1, fromY, toX, toY, ShisenSho.WEST, remainingBends-1) ||
					this.spider_search(fromX, fromY+1, toX, toY, ShisenSho.SOUTH, remainingBends);
			break;
			
		case ShisenSho.WEST:
			result = this.spider_search(fromX, fromY-1, toX, toY, ShisenSho.NORTH, remainingBends-1) ||
					this.spider_search(fromX, fromY+1, toX, toY, ShisenSho.SOUTH, remainingBends-1) ||
					this.spider_search(fromX-1, fromY, toX, toY, ShisenSho.WEST, remainingBends);
			break;
			
		}
		
		if (result) {
			this.path.push(fromX);
			this.path.push(fromY);
		}
		
		return result;
	}
	
	count_remaining_tiles() {
		let count=0;
		
		for (let x=0; x<ShisenSho.GRID_WIDTH; ++x) {
			for (let y=0; y<ShisenSho.GRID_HEIGHT; ++y) {
				if (this.cell_exists(x, y)) ++count;
			}
		}
		return count;
	}
	
	cell_exists(x, y) {
		return this.cells[x][y]!=null && this.cells[x][y].fadeoutBegan==false;
	}
	
	try_to_remove_cell_pair() {
		let x1, y1, x2, y2 
		let someCellsRemovedFlag = false;
		
		[x1, x2, y1, y2] = [-1, -1, -1, -1];
		
		for (let x=0; x<ShisenSho.GRID_WIDTH; ++x) {
			for (let y=0; y<ShisenSho.GRID_HEIGHT; ++y) {
				if (this.cell_exists(x, y) && this.cells[x][y].highlighted) {
					if (x1<0) {
						[x1, y1] = [x, y];
					}
					else {
						[x2, y2] = [x, y];
					}
				}
			}
		}
		
		if (this.magic_connect) {
			this.path = [];
			this.path.push(x1);
			this.path.push(y1);
			this.path.push(x2);
			this.path.push(y2);
		}
		if (this.magic_connect || this.spider_search_wrapper(x1, y1, x2, y2)) {
			
			this.magic_connect = false;
			
			for (let x=0; x<ShisenSho.GRID_WIDTH; ++x) {
				for (let y=0; y<ShisenSho.GRID_HEIGHT; ++y) {
					if (this.cell_exists(x, y) && this.cells[x][y].highlighted) {
						this.cells[x][y].beginFadeout();
						this.cell_removed(x, y);
						someCellsRemovedFlag = true;
					}
				}
			}
		}
		
		if (someCellsRemovedFlag) {
			this.some_cells_removed(true);
		}
	}
	
	some_cells_removed(show_path) {
		if (this.count_hinted_tiles() != 2) {
			this.clear_tile_hints();
		}
		if (show_path) {
			this.path_opacity = 1.0;
			this.drawPath([...this.path]);
		}
		this.do_endgame_check();
		this.updateUI();
	}
	
	drawPath(path) {
		if (this.overlayCanvas == null) return;
	this.overlayCanvas.classList.remove('fade-out');
	void this.overlayCanvas.offsetWidth; // Trigger reflow
	this.overlayCanvas.classList.add('fade-out');
		let ctx = this.overlayCanvas.getContext('2d');
		ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
		ctx.strokeStyle = 'red';
		ctx.lineWidth = 10;
		ctx.beginPath();
		const xScale = Tile.WIDTH + Tile.MARGIN;
		const yScale = Tile.HEIGHT + Tile.MARGIN;
		ctx.moveTo((path[0]+0.5) * xScale, (path[1]+0.5) * yScale);
		for (let i=2; i<path.length; i+=2) {
			ctx.lineTo((path[i]+0.5) * xScale, (path[i+1]+0.5) * yScale);
		}
		ctx.stroke();
	}
	
	cell_removed(cell_x, cell_y) {
		this.magic_connect = false;
	}
	
	selected_cell_count() {
		let result = 0;
		
		for (let y=0; y<ShisenSho.GRID_HEIGHT; ++y) {
			for (let x=0; x<ShisenSho.GRID_WIDTH; ++x) {
				if (this.cell_exists(x, y) && this.cells[x][y].highlighted) ++result;
			}
		}
		return result;
	}
}
