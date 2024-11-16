import { createCanvas, loadImage } from '@napi-rs/canvas';
import axios from 'axios';
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    GuildTextBasedChannel,
    Message,
    MessageComponentInteraction,
    User,
} from 'discord.js';
import { join } from 'path';
import ICommand from '../../handler/interfaces/ICommand';
import VOTEmbed from '../../util/VOTEmbed';

const assestsDir = join(__dirname, '..', '..', '..', 'assets', 'images', 'chess');
const loadChessPiece = async (name: string) => {
    return await loadImage(Buffer.from(await Bun.file(join(assestsDir, name + '.png')).arrayBuffer()))
}
const pieceImages = {
    'r': await loadChessPiece('black-rook'),
    'n': await loadChessPiece('black-knight'),
    'b': await loadChessPiece('black-bishop'),
    'q': await loadChessPiece('black-queen'),
    'k': await loadChessPiece('black-king'),
    'p': await loadChessPiece('black-pawn'),
    'R': await loadChessPiece('white-rook'),
    'N': await loadChessPiece('white-knight'),
    'B': await loadChessPiece('white-bishop'),
    'Q': await loadChessPiece('white-queen'),
    'K': await loadChessPiece('white-king'),
    'P': await loadChessPiece('white-pawn')
};

class ChessGame {
    private board: string[][];
    private canvas: any;
    private ctx: any;
    private tileSize: number;
    private channel: GuildTextBasedChannel;
    private user: User;
    private gameMessage: Message<boolean> | undefined;

    constructor(channel: GuildTextBasedChannel, user: User) {
        this.board = [
            ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
            ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
            [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
            [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
            [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
            [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
            ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
        ];
        this.canvas = createCanvas(400, 400);
        this.ctx = this.canvas.getContext('2d');
        this.tileSize = 50;
        this.channel = channel;
        this.user = user;
    }

    private async drawBoard() {
        // Draw the chess board
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                this.ctx.fillStyle = (x + y) % 2 === 0 ? '#ffffff' : '#808080';
                this.ctx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
            }
        }

        // Draw row and column labels
        this.ctx.fillStyle = '#000000';
        this.ctx.font = '20px Arial';
        for (let i = 0; i < 8; i++) {
            this.ctx.fillText(String.fromCharCode(65 + i), i * this.tileSize + this.tileSize / 2 - 5, 8 * this.tileSize + 20);
            this.ctx.fillText((8 - i).toString(), 8 * this.tileSize + 5, i * this.tileSize + this.tileSize / 2 + 5);
        }

        // Load and draw the pieces
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = this.board[y][x];
                if (piece !== ' ') {
                    this.ctx.drawImage((pieceImages as any)[piece], x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
                }
            }
        }

        // Save the canvas to a buffer
        const buffer = this.canvas.toBuffer('image/png');
        return buffer;
    }

    private async sendBoard() {
        const buffer = await this.drawBoard();
        const embed = new VOTEmbed()
            .setTitle('Chess Game')
            .setAuthor({ name: this.user.username, iconURL: this.user.displayAvatarURL() })
            .setImage('attachment://chess.png');

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('move')
                    .setLabel('Make a Move')
                    .setStyle(ButtonStyle.Primary)
            );

        if (this.gameMessage) {
            await this.gameMessage.edit({ embeds: [embed], files: [{ attachment: buffer, name: 'chess.png' }], components: [row] });
        } else {
            this.gameMessage = await this.channel.send({ embeds: [embed], files: [{ attachment: buffer, name: 'chess.png' }], components: [row] });
        }

        const filter = (interaction: MessageComponentInteraction) => interaction.customId === 'move' && interaction.user.id === this.user.id;
        const collector = this.gameMessage.createMessageComponentCollector({ filter });

        collector.on('collect', async (interaction) => {
            if (interaction.customId === 'move') {
                try { await interaction.update({}); } catch (e) { }
                await this.gameMessage!.edit({ components: [], content: 'Your turn: (Format: e2-e4)' });
                const moveCollector = this.channel.createMessageCollector({ filter: m => m.author.id === interaction.user.id, max: 1 });

                moveCollector.on('collect', async (msg) => {
                    const userMove = msg.content;
                    try {
                        await msg.delete();
                        this.makeMove(userMove, true);
                        if (this.isCheckmate(false)) {
                            await this.gameMessage!.edit({ content: `Checkmate! You win!`, components: [] });
                            return;
                        }
                        if (this.isStalemate(false)) {
                            await this.gameMessage!.edit({ content: `Stalemate! It's a draw!`, components: [] });
                            return;
                        }
                        await this.drawBoard();
                        await this.gameMessage!.edit({ content: `Your move: ${userMove}\nMy move: Processing`, components: [] });
                        const bestMove = await this.getBestMove();
                        this.makeMove(bestMove, false);
                        if (this.isCheckmate(true)) {
                            await this.gameMessage!.edit({ content: `Checkmate! I win!`, components: [] });
                            return;
                        }
                        if (this.isStalemate(true)) {
                            await this.gameMessage!.edit({ content: `Stalemate! It's a draw!`, components: [] });
                            return;
                        }
                        await this.drawBoard();
                        await this.sendBoard();
                        await this.gameMessage!.edit({ content: `Your move: ${userMove}\nMy move: ${bestMove}`, components: [row] });
                    } catch (error: any) {
                        await this.gameMessage!.edit({ content: `Error: ${error.message} try again`, components: [row] });
                    }
                });

                moveCollector.on('end', collected => {
                    if (collected.size === 0) {
                        interaction.reply('No move entered. Game ended.');
                    }
                });
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                this.gameMessage!.edit({ components: [] });
            }
        });
    }

    private getFen() {
        const fenRows = this.board.map(row => {
            let emptyCount = 0;
            return row.map(cell => {
                if (cell === ' ') {
                    emptyCount++;
                    return '';
                } else {
                    const result = emptyCount > 0 ? emptyCount + cell : cell;
                    emptyCount = 0;
                    return result;
                }
            }).join('') + (emptyCount > 0 ? emptyCount : '');
        });
        const fen = fenRows.join('/');
        return fen + ' b KQkq - 0 1'; // Set to black's turn
    }

    private async getBestMove() {
        const fen = this.getFen();
        const response = await axios.get(`https://stockfish.online/api/s/v2.php?fen=${encodeURIComponent(fen)}&depth=11`);
        const data = response.data;
        if (data.success) {
            const bestMoveMatch = data.bestmove.match(/bestmove\s([a-h][1-8])([a-h][1-8])/);
            if (!bestMoveMatch) {
                throw new Error('Failed to parse best move');
            }
            return bestMoveMatch[1] + '-' + bestMoveMatch[2];

        } else {
            throw new Error('Failed to get best move');
        }
    }

    private makeMove(move: string, isUserMove: boolean = true) {
        const movePattern = /^[a-h][1-8]-[a-h][1-8]$/;
        if (!movePattern.test(move)) {
            throw new Error('Invalid move format. Please use the format "e2-e4".');
        }

        const [from, to] = move.split('-');
        const [fromX, fromY] = [from.charCodeAt(0) - 'a'.charCodeAt(0), 8 - parseInt(from[1])];
        const [toX, toY] = [to.charCodeAt(0) - 'a'.charCodeAt(0), 8 - parseInt(to[1])];

        if (fromX < 0 || fromX > 7 || fromY < 0 || fromY > 7 || toX < 0 || toX > 7 || toY < 0 || toY > 7) {
            throw new Error('Move out of board boundaries.');
        }

        const piece = this.board[fromY][fromX];
        if (piece === ' ' || (isUserMove && piece !== piece.toUpperCase()) || (!isUserMove && piece !== piece.toLowerCase())) {
            throw new Error('You can only move your own pieces.');
        }

        if (!this.isValidMove(fromX, fromY, toX, toY)) {
            throw new Error('Invalid move according to chess rules.');
        }

        this.board[toY][toX] = this.board[fromY][fromX];
        this.board[fromY][fromX] = ' ';
    }

    private isValidMove(fromX: number, fromY: number, toX: number, toY: number): boolean {
        const piece = this.board[fromY][fromX].toLowerCase();
        const isWhite = this.board[fromY][fromX] === this.board[fromY][fromX].toUpperCase();
        const targetPiece = this.board[toY][toX];
        const isTargetWhite = targetPiece === targetPiece.toUpperCase();

        if (piece === 'p') {
            // Pawn movement rules
            const direction = isWhite ? -1 : 1;
            if (fromX === toX && this.board[toY][toX] === ' ' && (toY - fromY === direction || (fromY === (isWhite ? 6 : 1) && toY - fromY === 2 * direction && this.board[fromY + direction][fromX] === ' '))) {
                return true;
            }
            if (Math.abs(fromX - toX) === 1 && toY - fromY === direction && targetPiece !== ' ' && isWhite !== isTargetWhite) {
                return true;
            }
            return false;
        }

        if (piece === 'r') {
            // Rook movement rules
            if (fromX === toX || fromY === toY) {
                return this.isPathClear(fromX, fromY, toX, toY);
            }
            return false;
        }

        if (piece === 'n') {
            // Knight movement rules
            const dx = Math.abs(fromX - toX);
            const dy = Math.abs(fromY - toY);
            return (dx === 2 && dy === 1) || (dx === 1 && dy === 2);
        }

        if (piece === 'b') {
            // Bishop movement rules
            if (Math.abs(fromX - toX) === Math.abs(fromY - toY)) {
                return this.isPathClear(fromX, fromY, toX, toY);
            }
            return false;
        }

        if (piece === 'q') {
            // Queen movement rules
            if (fromX === toX || fromY === toY || Math.abs(fromX - toX) === Math.abs(fromY - toY)) {
                return this.isPathClear(fromX, fromY, toX, toY);
            }
            return false;
        }

        if (piece === 'k') {
            // King movement rules
            const dx = Math.abs(fromX - toX);
            const dy = Math.abs(fromY - toY);
            return (dx <= 1 && dy <= 1);
        }

        return false;
    }

    private isPathClear(fromX: number, fromY: number, toX: number, toY: number): boolean {
        const dx = Math.sign(toX - fromX);
        const dy = Math.sign(toY - fromY);
        let x = fromX + dx;
        let y = fromY + dy;
        while (x !== toX || y !== toY) {
            if (this.board[y][x] !== ' ') {
                return false;
            }
            x += dx;
            y += dy;
        }
        return true;
    }

    private isCheckmate(isWhite: boolean): boolean {
        // Check if the current player is in checkmate
        // This is a simplified version and may need more comprehensive checks
        const king = isWhite ? 'K' : 'k';
        const opponentMoves = this.getAllPossibleMoves(!isWhite);
        const kingPosition = this.findPiece(king);

        if (!kingPosition) return false;

        return opponentMoves.some(move => move.toX === kingPosition.x && move.toY === kingPosition.y);
    }

    private isStalemate(isWhite: boolean): boolean {
        // Check if the current player is in stalemate
        // This is a simplified version and may need more comprehensive checks
        const allMoves = this.getAllPossibleMoves(isWhite);
        return allMoves.length === 0;
    }

    private getAllPossibleMoves(isWhite: boolean): { fromX: number, fromY: number, toX: number, toY: number }[] {
        const moves = [];
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = this.board[y][x];
                if (piece !== ' ' && (isWhite ? piece === piece.toUpperCase() : piece === piece.toLowerCase())) {
                    for (let toY = 0; toY < 8; toY++) {
                        for (let toX = 0; toX < 8; toX++) {
                            if (this.isValidMove(x, y, toX, toY)) {
                                moves.push({ fromX: x, fromY: y, toX, toY });
                            }
                        }
                    }
                }
            }
        }
        return moves;
    }

    private findPiece(piece: string): { x: number, y: number } | null {
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                if (this.board[y][x] === piece) {
                    return { x, y };
                }
            }
        }
        return null;
    }

    public async play() {
        await this.drawBoard();
        await this.sendBoard();
    }
}

export default {
    description: 'Play a game of chess',
    options: [],
    type: 'guildOnly',
    cooldown: 10000,
    execute: async ({ channel, user, interaction }) => {
        await interaction?.reply({ content: 'Starting a game of chess...', ephemeral: true });
        const game = new ChessGame(channel as GuildTextBasedChannel, user);
        await game.play();
    },
} as ICommand;