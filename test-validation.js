// Test validation functions
const { isValidRoomCode, isValidPlayerName } = require('./src/lib/game-utils.ts');

console.log('Testing Room Code Validation:');
console.log('Valid codes:');
console.log('  ABC123:', isValidRoomCode('ABC123'));
console.log('  room1:', isValidRoomCode('room1'));
console.log('  123456:', isValidRoomCode('123456'));

console.log('Invalid codes:');
console.log('  ABC-123:', isValidRoomCode('ABC-123'));
console.log('  room@1:', isValidRoomCode('room@1'));
console.log('  room 1:', isValidRoomCode('room 1'));
console.log('  room#1:', isValidRoomCode('room#1'));
console.log('  empty:', isValidRoomCode(''));
console.log('  spaces only:', isValidRoomCode('   '));

console.log('\nTesting Player Name Validation:');
console.log('Valid names:');
console.log('  John Doe:', isValidPlayerName('John Doe'));
console.log('  Mary-Jane:', isValidPlayerName('Mary-Jane'));
console.log('  O\'Connor:', isValidPlayerName('O\'Connor'));
console.log('  Dr. Smith:', isValidPlayerName('Dr. Smith'));
console.log('  Player123:', isValidPlayerName('Player123'));

console.log('Invalid names:');
console.log('  John@Doe:', isValidPlayerName('John@Doe'));
console.log('  <script>:', isValidPlayerName('<script>'));
console.log('  John"Doe:', isValidPlayerName('John"Doe'));
console.log('  John&Doe:', isValidPlayerName('John&Doe'));
console.log('  empty:', isValidPlayerName(''));
console.log('  spaces only:', isValidPlayerName('   '));

