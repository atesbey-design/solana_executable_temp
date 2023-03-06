import {
    Keypair,
    Connection,
    PublicKey,
    LAMPORTS_PER_SOL,
    SystemProgram,
    TransactionInstruction,
    Transaction,
    sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
    createKeypairFromFile,
} from './util';
import fs from 'mz/fs';
import os from 'os';
import path from 'path';
import yaml from 'yaml';


const CONFIG_FILE_PATH = path.resolve(
    os.homedir(),
    '.config',
    'solana',
    'cli',
    'config.yml',
);

let connection: Connection;
let localKeypair: Keypair;
let programKeypair: Keypair;
let programId: PublicKey;
let clientPubKey: PublicKey;

const PROGRAM_PATH = path.resolve(
    __dirname,
    '../sum/target/deploy',
)

// Connect to the Solana devnet
async function connect (): Promise<void> {
    connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    console.log(`Successfully connected to Solana dev net.`);
}

// Get the local account
async function getLocalAccount (): Promise<void> {
    const config = await fs.readFile(CONFIG_FILE_PATH, {encoding: 'utf8'});
    const keypairPath = await yaml.parse(config).keypair_path;
    localKeypair = await createKeypairFromFile(keypairPath);
    console.log(`Using local account ${localKeypair.publicKey.toBase58()}`);
}


// Get the program account
async function getProgramAccount (): Promise<void> {
 programKeypair = await createKeypairFromFile(
        path.join(PROGRAM_PATH,'sum-keypair.json'),
    );
    
    programId = programKeypair.publicKey;
    console.log(`Using program account ${programId.toBase58()}`);
}



//config client account
 async function configureClientAccount() {
    const SEED = 'test2';
    clientPubKey = await PublicKey.createWithSeed(
        localKeypair.publicKey,
        SEED,
        programId,
    );

    console.log(`The generated address is:`);
    console.log(`   ${clientPubKey.toBase58()}`);

    // Make sure it doesn't exist already.
    const clientAccount = await connection.getAccountInfo(clientPubKey);
    if (clientAccount === null) {

        console.log(`Looks like that account does not exist. Let's create it.`);

        const transaction = new Transaction().add(
            SystemProgram.createAccountWithSeed({
                fromPubkey: localKeypair.publicKey,
                basePubkey: localKeypair.publicKey,
                seed: SEED,
                newAccountPubkey: clientPubKey,
                lamports: LAMPORTS_PER_SOL,
                space: 0,
                programId,
            }),
        );
        await sendAndConfirmTransaction(connection, transaction, [localKeypair]);

        console.log(`Client account created successfully.`);
    } else {
        console.log(`Looks like that account exists already. We can just use it.`);
    }
}

export async function pingProgram() {
    console.log(`All right, let's run it.`);
    

    const instruction = new TransactionInstruction({
        keys: [{pubkey: clientPubKey, isSigner: false, isWritable: true}],
        programId,
        data: Buffer.alloc(0), // Empty instruction data
    });
    console.log("ready")
    console.log("progarm id ",programId.toBase58())
 
    const transaction = new Transaction().add(instruction);

    await sendAndConfirmTransaction(connection, transaction, [localKeypair]);


    console.log(`Ping successful.`);
}

async function main (): Promise<void> {
    await connect();
    await getLocalAccount();
    await getProgramAccount();
    await configureClientAccount();
    await pingProgram();
}

main().then(
    () => process.exit(),
    err => {
        console.error(err);
        process.exit(-1);
    }
)