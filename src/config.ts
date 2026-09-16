// Interruptor do modo mock.
// true  -> o app usa os dados de exemplo (src/data/mock-processes.json) localmente,
//          SEM ler nem escrever no Firestore (não toca no banco real).
// false -> operação normal com o Firestore (banco real por empresa).
export const USE_MOCK_DATA = false;
