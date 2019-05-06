<?php

namespace App\Http\Controllers;
use App\User;
use App\Category;
use Illuminate\Support\Facades\Auth;

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
}
