#!/usr/bin/env python3
"""
Database duplication analysis script
"""

import os
from dotenv import load_dotenv
from supabase import create_client
from collections import Counter

# Load environment variables
load_dotenv()

# Create client
client = create_client(
    "https://yhticndmpvzczquivpfb.supabase.co",
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

print("=== DATABASE DUPLICATION ANALYSIS ===")
print("=" * 60)

# Tables to analyze for duplicates
tables_to_check = [
    'esg_assessments',  # emission_history_assessments
    'emission_calculations',
    'counterparty_questionnaires', 
    'counterparties',
    'scenario_runs',  # finance_emission_calculations (closest match)
    'v_user_portfolio_totals'  # This is a view, let's check if it exists
]

def analyze_duplicates(table_name):
    try:
        print(f"\n📊 ANALYZING TABLE: {table_name}")
        print("-" * 40)
        
        # Get all records
        result = client.table(table_name).select("*").execute()
        records = result.data
        
        if not records:
            print(f"❌ No records found in {table_name}")
            return
            
        total_records = len(records)
        print(f"📈 Total records: {total_records}")
        
        # Check for duplicate IDs
        ids = [record.get('id') for record in records if 'id' in record]
        if ids:
            id_counts = Counter(ids)
            duplicate_ids = {id_val: count for id_val, count in id_counts.items() if count > 1}
            
            if duplicate_ids:
                print(f"🚨 DUPLICATE IDs FOUND: {len(duplicate_ids)}")
                for dup_id, count in duplicate_ids.items():
                    print(f"   ID: {dup_id} appears {count} times")
            else:
                print("✅ No duplicate IDs found")
        
        # Check for duplicate user_ids
        user_ids = [record.get('user_id') for record in records if 'user_id' in record]
        if user_ids:
            user_id_counts = Counter(user_ids)
            duplicate_users = {user_id: count for user_id, count in user_id_counts.items() if count > 1}
            
            if duplicate_users:
                print(f"👥 Users with multiple records:")
                for user_id, count in duplicate_users.items():
                    print(f"   User: {user_id} has {count} records")
        
        # Check for duplicate counterparty_ids
        counterparty_ids = [record.get('counterparty_id') for record in records if 'counterparty_id' in record]
        if counterparty_ids:
            counterparty_counts = Counter(counterparty_ids)
            duplicate_counterparties = {cp_id: count for cp_id, count in counterparty_counts.items() if count > 1}
            
            if duplicate_counterparties:
                print(f"🏢 Counterparties with multiple records:")
                for cp_id, count in duplicate_counterparties.items():
                    print(f"   Counterparty: {cp_id} has {count} records")
        
        # Show sample records to understand structure
        print(f"\n📋 Sample records:")
        for i, record in enumerate(records[:3]):
            print(f"   Record {i+1}:")
            for key, value in record.items():
                if isinstance(value, str) and len(value) > 50:
                    value = value[:50] + "..."
                print(f"     {key}: {value}")
            print()
            
    except Exception as e:
        print(f"❌ Error analyzing {table_name}: {e}")

# Analyze each table
for table in tables_to_check:
    analyze_duplicates(table)

# Check if v_user_portfolio_totals view exists
print(f"\n📊 CHECKING VIEW: v_user_portfolio_totals")
print("-" * 40)
try:
    result = client.table("v_user_portfolio_totals").select("*").execute()
    records = result.data
    print(f"✅ View exists with {len(records)} records")
    
    if records:
        print("📋 Sample view data:")
        for record in records[:3]:
            print(f"   {record}")
            
except Exception as e:
    print(f"❌ View error: {e}")

print("\n" + "=" * 60)
print("DUPLICATION ANALYSIS COMPLETE")
