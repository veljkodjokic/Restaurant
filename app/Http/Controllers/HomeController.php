<?php

namespace App\Http\Controllers;
use App\User;
use App\Goods;
use App\Category;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\View;

class HomeController extends Controller
{
    /**
     * Create a new controller instance.
     *
     * @return void
     */
    public function __construct()
    {
        $this->middleware('auth');
    }

    /**
     * Show the application dashboard.
     *
     * @return \Illuminate\View\View
     */
    public function index()
    {
        if(Auth::User()->isAdmin()) {
            return view('admin.admindash');
        }
        else {
            $categories=Category::all();
            return view('dashboard',compact("categories"));
        }
    }

    /**
     * Show the goods by selected category.
     *
     * @return \Illuminate\View\View
     */
    public function getCategory($name)
    {
        $category=Category::where('name',$name)->first();
        $goods=$category->goods()->get();
        return view('category',compact("goods","category"));
    }

    /**
     * Show the searched categories
     *
     * @return \Illuminate\View\View
     */
    public function searchCategory(Request $request)
    {
        $input = $request->all();
        $keywords=$input["keywords"];
        $categories = Category::where('name','LIKE','%'.$keywords.'%')->get();

        return View::make('searched.category')->with('searchCategories',$categories);
    }

    /**
     * Show the searched categories
     *
     * @return \Illuminate\View\View
     */
    public function searchGoods(Request $request)
    {
        $input = $request->all();
        $keywords=$input["keywords"];
        $category_name=$input["category"];
        $category=Category::where('name',$category_name)->first();

        $goods = Goods::where('name','LIKE','%'.$keywords.'%')->where('category_id',$category->id)->get();

        return View::make('searched.goods')->with('searchGoods',$goods);
    }

    public function getActivity()
    {
        $user=Auth::user();
        $invoices=$user->invoices()->orderBy('updated_at', 'desc')->get();

        return view('activity',compact("invoices"));
    }
}
