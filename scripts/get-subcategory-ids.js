const { supabase } = require('../src/config');

async function getSubcategoryIds() {
  try {
    console.log('🔍 Fetching all subcategories...\n');
    
    const { data: subcategories, error } = await supabase
      .from('portfolio_subcategories')
      .select(`
        id,
        name,
        slug,
        client_name,
        portfolio_categories(
          id,
          name,
          slug
        )
      `)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('❌ Error fetching subcategories:', error.message);
      return;
    }

    if (!subcategories || subcategories.length === 0) {
      console.log('📝 No subcategories found. You need to create some first!');
      console.log('\n💡 To create a subcategory, use:');
      console.log('POST /api/portfolio/subcategories');
      return;
    }

    console.log('📋 Available Subcategories:\n');
    console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
    console.log('│ ID                                     │ Name                │ Category      │');
    console.log('├─────────────────────────────────────────────────────────────────────────────┤');

    subcategories.forEach(sub => {
      const id = sub.id.padEnd(36);
      const name = (sub.name || 'N/A').padEnd(20);
      const category = (sub.portfolio_categories?.name || 'N/A').padEnd(13);
      console.log(`│ ${id} │ ${name} │ ${category} │`);
    });

    console.log('└─────────────────────────────────────────────────────────────────────────────┘');
    
    console.log('\n💡 Copy any ID above and use it in your project creation request.');
    console.log('   Example: subcategoryId: 2b1c4e2a-1234-4cde-8f9a-abcdef123456');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the script
getSubcategoryIds(); 