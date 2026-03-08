import { getDb } from '../connection.js';
import { customers, investorProfiles, communicationHistory } from '../schema/customers.js';
import { encryptIfPresent } from '../../utils/crypto.js';
import { v4 as uuidv4 } from 'uuid';
import { SEED_USER_IDS } from './users.seed.js';

export async function seedCustomers() {
  const db = getDb();

  const customer1Id = '01900000-0000-7000-8000-000000000100';
  const customer2Id = '01900000-0000-7000-8000-000000000101';
  const customer3Id = '01900000-0000-7000-8000-000000000102';

  db.insert(customers)
    .values([
      {
        id: customer1Id,
        mnemonic: 'SILVA001',
        fullName: 'João da Silva',
        email: 'joao.silva@email.com',
        phone: '+55 11 99999-0001',
        riskProfile: 'moderate',
        investorNotes: 'Experienced investor. Prefers diversified portfolio.',
        taxIdEnc: encryptIfPresent('123.456.789-00'),
        dateOfBirthEnc: encryptIfPresent('1975-03-15'),
        addressEnc: encryptIfPresent('Rua das Flores, 100, São Paulo, SP, 01310-000'),
        bankDetailsEnc: encryptIfPresent('Banco Itaú - Ag: 0001 CC: 12345-6'),
        createdBy: SEED_USER_IDS.manager,
      },
      {
        id: customer2Id,
        mnemonic: 'COST001',
        fullName: 'Maria Costa',
        email: 'maria.costa@email.com',
        phone: '+55 11 98888-0002',
        riskProfile: 'conservative',
        investorNotes: 'First-time investor. Prefers low-risk assets.',
        taxIdEnc: encryptIfPresent('987.654.321-00'),
        dateOfBirthEnc: encryptIfPresent('1982-07-22'),
        addressEnc: encryptIfPresent('Av. Paulista, 1000, São Paulo, SP, 01310-100'),
        bankDetailsEnc: null,
        createdBy: SEED_USER_IDS.manager,
      },
      {
        id: customer3Id,
        mnemonic: 'OLIVEI001',
        fullName: 'Carlos Oliveira',
        email: 'carlos.oliveira@email.com',
        phone: null,
        riskProfile: 'aggressive',
        investorNotes: 'High-net-worth investor. Interested in alternative investments.',
        taxIdEnc: null,
        dateOfBirthEnc: null,
        addressEnc: null,
        bankDetailsEnc: null,
        createdBy: SEED_USER_IDS.admin,
      },
    ])
    .onConflictDoNothing()
    .run();

  db.insert(investorProfiles)
    .values([
      {
        id: uuidv4(),
        customerId: customer1Id,
        notes: 'Completed suitability questionnaire on 2024-01-10.',
        formResponses: JSON.stringify({
          investmentHorizon: '10+ years',
          monthlyIncome: 'R$ 15,000 - R$ 30,000',
          currentAssets: 'R$ 100,000 - R$ 500,000',
        }),
      },
      {
        id: uuidv4(),
        customerId: customer2Id,
        notes: 'Completed onboarding. Goals: retirement fund.',
        formResponses: JSON.stringify({
          investmentHorizon: '5-10 years',
          monthlyIncome: 'R$ 5,000 - R$ 10,000',
          currentAssets: 'R$ 10,000 - R$ 50,000',
        }),
      },
    ])
    .onConflictDoNothing()
    .run();

  db.insert(communicationHistory)
    .values([
      {
        id: uuidv4(),
        customerId: customer1Id,
        channel: 'meeting',
        summary: 'Initial consultation. Discussed risk tolerance and investment goals.',
        occurredAt: '2024-01-10T14:00:00.000Z',
        recordedBy: SEED_USER_IDS.manager,
      },
      {
        id: uuidv4(),
        customerId: customer1Id,
        channel: 'whatsapp',
        summary: 'Client asked about quarterly portfolio rebalancing.',
        occurredAt: '2024-02-15T10:30:00.000Z',
        recordedBy: SEED_USER_IDS.manager,
      },
      {
        id: uuidv4(),
        customerId: customer2Id,
        channel: 'email',
        summary: 'Sent welcome email and onboarding documents.',
        occurredAt: '2024-01-20T09:00:00.000Z',
        recordedBy: SEED_USER_IDS.manager,
      },
    ])
    .onConflictDoNothing()
    .run();

  console.info('[seed] Customers seeded (3 customers with profiles and communications).');
}
